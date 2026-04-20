import { validateShareToken } from "@/lib/share-token";
import { Download, Share2, Clock, XCircle, FileText, Image, Video, File } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface PageProps {
  params: Promise<{ token: string }>;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image size={20} className="text-blue-400" />;
  if (mimeType.startsWith("video/")) return <Video size={20} className="text-purple-400" />;
  if (mimeType === "application/pdf") return <FileText size={20} className="text-red-400" />;
  return <File size={20} className="text-slate-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function PublicDownloadPage({ params }: PageProps) {
  const { token } = await params;
  const { valid, reason, link } = await validateShareToken(token);

  // Not found
  if (!link) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle size={40} className="text-slate-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-700">Link niet gevonden</h1>
          <p className="text-sm text-slate-400 mt-1">Deze downloadlink bestaat niet.</p>
        </div>
      </div>
    );
  }

  // Expired or revoked
  if (!valid) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            {reason === "revoked" ? "Link ingetrokken" : "Link verlopen"}
          </h1>
          <p className="text-sm text-slate-500 mt-2 mb-4">
            {reason === "revoked"
              ? "De afzender heeft deze link ingetrokken."
              : `Deze link is verlopen op ${format(new Date(link.expiresAt), "d MMMM yyyy", { locale: nl })}.`}
          </p>
          <p className="text-xs text-slate-400">Neem contact op met de afzender voor een nieuwe link.</p>
          <p className="text-xs text-slate-300 mt-6">Gedeeld via De Leo Media</p>
        </div>
      </div>
    );
  }

  const totalSize = link.files.reduce((sum, f) => sum + f.file.size, 0);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const baseUrl = `${appUrl}/api/download/${token}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center">
              <Share2 size={16} className="text-white" />
            </div>
            <span className="font-semibold text-slate-700">De Leo Media</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            {link.createdBy.name} heeft bestanden gedeeld
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {link.files.length} bestand(en) · {formatSize(totalSize)}
          </p>
        </div>

        {/* Message */}
        {link.message && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm text-slate-600 italic">
            &ldquo;{link.message}&rdquo;
          </div>
        )}

        {/* Expiry */}
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          <Clock size={12} />
          Verloopt {formatDistanceToNow(new Date(link.expiresAt), { locale: nl, addSuffix: true })}
          <span className="text-slate-300">·</span>
          {format(new Date(link.expiresAt), "d MMM yyyy", { locale: nl })}
        </div>

        {/* Files */}
        <div className="space-y-2 mb-6">
          {link.files.map((f) => (
            <a
              key={f.fileId}
              href={`${baseUrl}?fileId=${f.fileId}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-teal-50 transition-colors group"
            >
              <FileIcon mimeType={f.file.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{f.file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(f.file.size)}</p>
              </div>
              <Download size={14} className="text-slate-300 group-hover:text-teal-600 shrink-0" />
            </a>
          ))}
        </div>

        {/* Download all */}
        {link.files.length > 1 && (
          <a
            href={`${baseUrl}/zip`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Alles downloaden (.zip)
          </a>
        )}

        <p className="text-center text-xs text-slate-300 mt-6">
          Gedeeld via{" "}
          <Link href={appUrl || "/"} className="hover:text-teal-600">
            De Leo Media
          </Link>
        </p>
      </div>
    </div>
  );
}
