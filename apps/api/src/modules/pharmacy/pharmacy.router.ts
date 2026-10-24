import { Router } from 'express';
import { MedicineModel, PrescriptionModel, UserModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest, enforceTenant } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { UserRole, NotificationType } from '@medcore/types';
import { sendNotification } from '../notifications/notification.service';
import mongoose from 'mongoose';

const router = Router();

// GET /medicines — Search medicines
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { search, hospitalId } = req.query;
    const filter: any = {};

    if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.hospitalId) {
      filter.hospitalId = req.user!.hospitalId;
    } else if (hospitalId) {
      filter.hospitalId = hospitalId;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search as string, 'i') },
        { genericName: new RegExp(search as string, 'i') },
      ];
    }

    const medicines = await MedicineModel.find(filter).lean();
    return sendSuccess(res, medicines.map((m: any) => ({ ...m, id: m._id })));
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /medicines — Add medicine catalog entry
router.post('/', authenticate, requireRoles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, genericName, category, form, manufacturer, reorderLevel } = req.body;
    if (!name || !genericName || !form || !manufacturer) {
      return sendError(res, 'VALIDATION_ERROR', 'name, genericName, form, and manufacturer are required', 400);
    }

    const hospitalId = req.user!.hospitalId || req.body.hospitalId;
    const medicine = await MedicineModel.create({
      hospitalId,
      name,
      genericName,
      category: category || 'General',
      form,
      manufacturer,
      reorderLevel: reorderLevel || 20,
      totalStock: 0,
      batches: [],
    });

    return sendSuccess(res, medicine, 'Medicine added to catalog', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /medicines/:id/batches — Add stock batch
router.post('/:id/batches', authenticate, requireRoles(UserRole.PHARMACIST, UserRole.HOSPITAL_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const { batchNumber, manufacturingDate, expiryDate, quantity, unitCost, mrp } = req.body;
    if (!batchNumber || !manufacturingDate || !expiryDate || quantity == null || !unitCost || !mrp) {
      return sendError(res, 'VALIDATION_ERROR', 'All batch parameters are required', 400);
    }

    const medicine = await MedicineModel.findById(req.params.id);
    if (!medicine) return sendError(res, 'NOT_FOUND', 'Medicine not found', 404);

    const today = new Date().toISOString().split('T')[0];
    const isQuarantined = expiryDate < today;

    medicine.batches.push({
      id: new mongoose.Types.ObjectId().toString(),
      batchNumber,
      manufacturingDate,
      expiryDate,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      mrp: Number(mrp),
      isQuarantined,
    });

    await medicine.save();
    return sendSuccess(res, medicine, 'Stock batch added successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /pharmacy/dispense — FIFO Dispensing Engine
router.post('/dispense', authenticate, requireRoles(UserRole.PHARMACIST), async (req: AuthenticatedRequest, res) => {
  try {
    const { prescriptionId, items } = req.body; // items: Array<{ medicineId: string, quantity: number }>
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'items array is required', 400);
    }

    const today = new Date().toISOString().split('T')[0];
    const dispensedDetails: any[] = [];

    for (const item of items) {
      const medicine = await MedicineModel.findById(item.medicineId);
      if (!medicine) {
        return sendError(res, 'NOT_FOUND', `Medicine with ID ${item.medicineId} not found`, 404);
      }

      // Check expired stock quarantine rule
      const validBatches = medicine.batches
        .filter((b) => !b.isQuarantined && b.expiryDate >= today && b.quantity > 0)
        // Sort FIFO: oldest manufacturing date first
        .sort((a, b) => a.manufacturingDate.localeCompare(b.manufacturingDate));

      const totalAvailable = validBatches.reduce((acc, b) => acc + b.quantity, 0);
      if (totalAvailable < item.quantity) {
        return sendError(
          res,
          'INSUFFICIENT_STOCK',
          `Insufficient non-expired stock for ${medicine.name}. Requested: ${item.quantity}, Available: ${totalAvailable}`,
          400
        );
      }

      // Deduct quantity using FIFO
      let remainingToDeduct = item.quantity;
      let totalCost = 0;

      for (const batch of validBatches) {
        if (remainingToDeduct <= 0) break;

        const deduct = Math.min(batch.quantity, remainingToDeduct);
        batch.quantity -= deduct;
        remainingToDeduct -= deduct;
        totalCost += deduct * batch.mrp;
      }

      await medicine.save();

      // Check low stock alert rule (< reorderLevel)
      if (medicine.totalStock <= medicine.reorderLevel) {
        // Find hospital admin to notify
        const admins = await UserModel.find({
          hospitalId: medicine.hospitalId,
          role: UserRole.HOSPITAL_ADMIN,
        });

        for (const admin of admins) {
          await sendNotification({
            hospitalId: medicine.hospitalId,
            recipientUserId: admin._id,
            title: '⚠️ Low Stock Alert',
            message: `Stock for ${medicine.name} is low (${medicine.totalStock} units remaining; reorder level is ${medicine.reorderLevel}).`,
            type: NotificationType.LOW_STOCK_ALERT,
            metadata: { medicineId: medicine._id },
          });
        }
      }

      dispensedDetails.push({
        medicineId: medicine._id,
        name: medicine.name,
        quantity: item.quantity,
        totalCost,
      });
    }

    if (prescriptionId) {
      await PrescriptionModel.findByIdAndUpdate(prescriptionId, {
        isDispensed: true,
        dispensedAt: new Date(),
      });
    }

    return sendSuccess(res, { dispensedDetails }, 'Medicines dispensed successfully via FIFO');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
