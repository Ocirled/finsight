import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Gunakan domain terverifikasi di Resend. Untuk testing tanpa domain,
// Resend menyediakan "onboarding@resend.dev" (hanya bisa kirim ke email akunmu sendiri).
const FROM = process.env.EMAIL_FROM ?? "FinSight <onboarding@resend.dev>";

interface SendResult {
  sent: boolean;
  error?: string;
}

/** Kirim email verifikasi berisi tautan konfirmasi. */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<SendResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY belum diset — email tidak dikirim");
    return { sent: false, error: "RESEND_API_KEY belum dikonfigurasi" };
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Verifikasi email FinSight kamu",
    html: verificationTemplate(verifyUrl),
  });

  if (error) {
    console.error("[email] Resend error:", error);
    return { sent: false, error: error.message };
  }

  return { sent: true };
}

function verificationTemplate(verifyUrl: string): string {
  return `
  <div style="background:#faf9f7;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #dad4c8;border-radius:20px;overflow:hidden;">
      <div style="padding:28px 32px 8px;">
        <div style="font-size:20px;font-weight:700;color:#078a52;">FinSight</div>
      </div>
      <div style="padding:8px 32px 32px;">
        <h1 style="font-size:18px;color:#000000;margin:16px 0 8px;">Verifikasi alamat email kamu</h1>
        <p style="font-size:14px;line-height:1.6;color:#55534e;margin:0 0 24px;">
          Klik tombol di bawah untuk mengonfirmasi email ini dan mengaktifkan akun FinSight kamu.
          Tautan berlaku selama 24 jam.
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#078a52;color:#ffffff;text-decoration:none;
                  font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;">
          Verifikasi Email
        </a>
        <p style="font-size:12px;line-height:1.6;color:#9f9b93;margin:24px 0 0;">
          Kalau tombol tidak berfungsi, salin tautan ini ke browser:<br>
          <a href="${verifyUrl}" style="color:#078a52;word-break:break-all;">${verifyUrl}</a>
        </p>
        <p style="font-size:12px;color:#9f9b93;margin:24px 0 0;">
          Kamu tidak meminta ini? Abaikan saja email ini.
        </p>
      </div>
    </div>
  </div>`;
}
