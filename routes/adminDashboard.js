import express from 'express';
import RepairRequest from '../models/RepairRequest.js';
import RoomBooking from '../models/RoomBooking.js'; // ensure this model exists
import Staff from '../models/Staff.js';


const router = express.Router();

/**
 * GET /api/admin/repair-summary
 * Returns count of assigned, pending, and completed repair requests
 */
router.get('/repair-summary', async (req, res) => {
  try {
    const assigned = await RepairRequest.countDocuments({ assignedTo: { $ne: "" }, status: { $ne: "Completed" } });
    const pending = await RepairRequest.countDocuments({ status: "Pending" });
    const completed = await RepairRequest.countDocuments({ status: "Completed" });

    res.json({ assigned, pending, completed });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

/**
 * GET /api/admin/repair-staff-summary
 * Returns list of staff with counts of assigned and completed requests
 */
// GET /api/admin/repair-staff-summary?from=2025-05-01&to=2025-06-01
router.get('/repair-staff-summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { assignedTo: { $ne: "" } };

    // Apply date filter if provided
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999); // include full 'to' day

      query.createdAt = { $gte: fromDate, $lte: toDate };
    }

    const allStaff = await Staff.find({}, 'name');
    const requests = await RepairRequest.find(query);

    const staffMap = {};

    allStaff.forEach(staff => {
      staffMap[staff.name] = { name: staff.name, assigned: 0, completed: 0 };
    });

    for (const req of requests) {
      const name = req.assignedTo;
      if (!staffMap[name]) {
        staffMap[name] = { name, assigned: 0, completed: 0 };
      }
      staffMap[name].assigned++;
      if (req.status === "Completed") {
        staffMap[name].completed++;
      }
    }

    res.json(Object.values(staffMap));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch staff summary" });
  }
});

/**
 * GET /api/admin/room-requests
 * Aggregates room bookings grouped by department or user
 */
/**
 * GET /api/admin/room-requests
 * Aggregates active room bookings grouped by roomType
 * Excludes completed and cancelled
 */
/**
 * GET /api/admin/room-requests
 * Returns only "pending" booking requests grouped by roomType
 */
router.get('/room-requests', async (req, res) => {
  try {
    // 1. Define all rooms
    const allRooms = [
      "Auditorium",
      "Decennial",
      "Insight",
      "415/416",
      "Guest Room",
      "Main Dinning Hall",
      "Dinning Hall Near Decennial",
      "OTHER (Enter Remarks)"
    ];

    console.log("📌 [DEBUG] Room requests endpoint hit");

    // 2. Aggregate ONLY pending booking requests
    const bookings = await RoomBooking.aggregate([
      {
        $match: { status: "pending" }   // ✅ filter
      },
      {
        $group: {
          _id: "$roomType",
          count: { $sum: 1 }
        }
      }
    ]);

    console.log("📌 [DEBUG] Aggregated bookings:", bookings);

    // 3. Convert to dictionary
    const bookingMap = {};
    bookings.forEach(item => {
      bookingMap[item._id] = item.count;
    });

    console.log("📌 [DEBUG] bookingMap:", bookingMap);

    // 4. Merge with full room list
    const finalList = allRooms.map(room => ({
      name: room,
      count: bookingMap[room] || 0
    }));

    console.log("📌 [DEBUG] Final list sent to client:", finalList);

    res.json(finalList);
  } catch (err) {
    console.error("❌ Room request summary failed:", err);
    res.status(500).json({ message: "Failed to fetch room requests" });
  }
});

export default router;
