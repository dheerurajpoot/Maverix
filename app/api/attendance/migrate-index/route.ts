import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';

/**
 * Migration route to drop the old unique index on userId + date
 * This allows multiple clock ins/outs per day
 * Run this route once: GET /api/attendance/migrate-index
 */
export async function GET() {
  try {
    await connectDB();

    const collection = Attendance.collection;
    const indexes = await collection.indexes();

    // Find the unique index on userId_1_date_1
    const uniqueIndex = indexes.find(
      (idx: any) => idx.name === 'userId_1_date_1' && idx.unique === true
    );

    if (uniqueIndex) {
      // Drop the unique index
      await collection.dropIndex('userId_1_date_1');
      
      // Create a new non-unique index
      await collection.createIndex({ userId: 1, date: 1 }, { unique: false });

      return NextResponse.json({
        success: true,
        message: 'Successfully dropped unique index and created non-unique index',
      });
    } else {
      // Check if non-unique index exists
      const nonUniqueIndex = indexes.find(
        (idx: any) => idx.name === 'userId_1_date_1' && idx.unique !== true
      );

      if (nonUniqueIndex) {
        return NextResponse.json({
          success: true,
          message: 'Index already migrated (non-unique index exists)',
        });
      } else {
        // Create the non-unique index
        await collection.createIndex({ userId: 1, date: 1 }, { unique: false });
        
        return NextResponse.json({
          success: true,
          message: 'Created non-unique index',
        });
      }
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    
    // If index doesn't exist, that's okay - try to create the non-unique one
    if (error.code === 27 || error.message?.includes('index not found')) {
      try {
        await Attendance.collection.createIndex({ userId: 1, date: 1 }, { unique: false });
        return NextResponse.json({
          success: true,
          message: 'Index did not exist, created non-unique index',
        });
      } catch (createError: any) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create index',
            details: createError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed',
      },
      { status: 500 }
    );
  }
}


