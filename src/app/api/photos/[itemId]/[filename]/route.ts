import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { getPhotoPath } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

/**
 * GET /api/photos/[itemId]/[filename]
 * Serve a photo file (authenticated)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string; filename: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const { itemId, filename } = await params;
    const itemIdNum = parseInt(itemId);

    if (isNaN(itemIdNum)) {
      throw ApiErrors.BadRequest('Invalid item ID');
    }

    // Get item to check ownership
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemIdNum),
    });

    if (!item) {
      throw ApiErrors.NotFound('Item');
    }

    // Check read access
    if (!canAccessResource(item.ownerId, session.user.id, session, 'read')) {
      throw ApiErrors.Forbidden();
    }

    // Get photo path
    const photoPath = getPhotoPath(itemIdNum, filename);

    // Check if file exists
    if (!existsSync(photoPath)) {
      throw ApiErrors.NotFound('Photo');
    }

    // Read file
    const fileBuffer = readFileSync(photoPath);

    // Determine content type from extension
    const ext = extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  })(req, { params });
}
