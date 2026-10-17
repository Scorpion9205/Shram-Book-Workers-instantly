import { z } from 'zod';

// Where the money should be sent. UPI needs a UPI id; BANK needs the full account details.
const payoutDetailsFields = {
  method: z.enum(['UPI', 'BANK']),
  upiId: z.string().trim().regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, 'Enter a valid UPI id (e.g. name@bank).').optional(),
  accountHolderName: z.string().trim().min(2).max(100).optional(),
  accountNumber: z.string().trim().regex(/^[0-9]{9,18}$/, 'Account number must be 9 to 18 digits.').optional(),
  ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code.').optional(),
  bankName: z.string().trim().min(2).max(100).optional(),
};

const withPayoutDetailsCheck = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data: any, ctx) => {
    if (data.method === 'UPI' && !data.upiId) {
      ctx.addIssue({ code: 'custom', path: ['upiId'], message: 'UPI id is required.' });
    }
    if (data.method === 'BANK') {
      for (const field of ['accountHolderName', 'accountNumber', 'ifscCode', 'bankName'] as const) {
        if (!data[field]) {
          ctx.addIssue({ code: 'custom', path: [field], message: 'This field is required for a bank payout.' });
        }
      }
    }
  });

export const payoutDetailsSchema = withPayoutDetailsCheck(z.object(payoutDetailsFields));

export const workerWithdrawalSchema = withPayoutDetailsCheck(
  z.object({ amount: z.number().positive(), ...payoutDetailsFields }),
);

export const markPaidSchema = z.object({
  transactionRef: z.string().trim().min(3, 'Enter the UPI/bank transaction reference.').max(100),
});

export const rejectPayoutSchema = z.object({
  reason: z.string().trim().min(3, 'Give a short reason.').max(300),
});

export const listPayoutsQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'REJECTED']).optional(),
  kind: z.enum(['WORKER_WALLET', 'AGENT_COMMISSION', 'AGENT_WORKER_FUNDS']).optional(),
});
