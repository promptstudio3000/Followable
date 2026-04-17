import { z } from "zod";

export const uploadedMediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().trim().min(1),
  alt: z.string().trim().max(160).optional().nullable(),
  blurDataUrl: z.string().trim().optional().nullable(),
});

export const createPostSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(20).max(5000),
    teaser: z.string().trim().max(220).optional().nullable(),
    topicId: z.string().trim().min(1).nullable(),
    visibilityType: z.enum(["public", "subscriber_only", "special_hidden_place"]),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    address: z.string().trim().max(240).optional().nullable(),
    placeName: z.string().trim().max(160).optional().nullable(),
    placeId: z.string().trim().min(1).max(160).optional().nullable(),
    placeKey: z.string().trim().min(1).max(240).optional().nullable(),
    city: z.string().trim().min(1).max(120),
    district: z.string().trim().max(120).optional().nullable(),
    region: z.string().trim().min(1).max(120),
    country: z.string().trim().min(1).max(120),
    specialPrice: z.number().positive().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    visibilityStart: z.string().optional().nullable(),
    visibilityEnd: z.string().optional().nullable(),
    media: z.array(uploadedMediaSchema).max(6).optional(),
  })
  .superRefine((value, context) => {
    if (value.visibilityType === "special_hidden_place" && !value.specialPrice) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Special hidden places need a one-off unlock price.",
        path: ["specialPrice"],
      });
    }

    if (value.visibilityStart && value.visibilityEnd) {
      const start = new Date(value.visibilityStart).getTime();
      const end = new Date(value.visibilityEnd).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Visible until must be after visible from.",
          path: ["visibilityEnd"],
        });
      }
    }
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  postId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(1200),
  parentCommentId: z.string().trim().optional().nullable(),
});

export const toggleFollowSchema = z.object({
  targetUserId: z.string().trim().min(1),
});

export const toggleSaveSchema = z.object({
  postId: z.string().trim().min(1),
});

export const toggleBlockSchema = z.object({
  targetUserId: z.string().trim().min(1),
});

export const toggleReactionSchema = z.object({
  postId: z.string().trim().min(1),
  type: z.enum(["fire", "insight", "want", "thanks"]),
});

export const createReportSchema = z.object({
  targetType: z.enum(["post", "user"]),
  targetId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(1200),
});

export const walletVerifySchema = z.object({
  message: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});

export const paymentQuoteSchema = z
  .object({
    asset: z.enum(["eth", "usdc"]),
    targetType: z.enum(["subscription", "special_unlock"]),
    creatorId: z.string().trim().optional().nullable(),
    postId: z.string().trim().optional().nullable(),
  })
  .superRefine((value, context) => {
    if (value.targetType === "subscription" && !value.creatorId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Creator subscription quotes require creatorId.",
        path: ["creatorId"],
      });
    }

    if (value.targetType === "special_unlock" && !value.postId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Special unlock quotes require postId.",
        path: ["postId"],
      });
    }
  });

export const paymentConfirmSchema = paymentQuoteSchema.extend({
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/),
  walletAddress: z.string().trim().min(1),
});
