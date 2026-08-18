import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadImageToImgBB } from "@/services/imgbb";

interface TeamLogoUploaderProps {
  onLogoChange: (logoUrl: string) => void;
  currentLogo?: string;
  label?: string;
  description?: string;
}

export function TeamLogoUploader({
  onLogoChange,
  currentLogo,
  label = "Logo do Time *",
  description = "Arraste uma imagem, escolha um arquivo ou cole o link de uma imagem externa (máx. 5MB)",
}: TeamLogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentLogo || "");
  const [isUploading, setIsUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        setPreviewUrl(base64String);

        const imageUrl = await uploadImageToImgBB(base64String);

        onLogoChange(imageUrl);
        setIsUploading(false);
        toast.success("Imagem carregada com sucesso!");
      } catch (error) {
        console.error("Erro no upload:", error);
        toast.error("Erro ao fazer upload da imagem");
        setPreviewUrl("");
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao carregar a imagem");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onLogoChange("");
    toast.info("Imagem removida");
  };

  const usarUrlExterna = () => {
    const url = externalUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      toast.error("Informe uma URL de imagem válida (https://...)");
      return;
    }
    setPreviewUrl(url);
    onLogoChange(url);
    setExternalUrl("");
    toast.success("Imagem externa aplicada!");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Logo do time"
              className="w-full h-48 object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              aria-label="Remover logo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <Upload className="w-12 h-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground text-center">
              {isUploading ? "Carregando..." : "Clique ou arraste uma imagem aqui"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              PNG, JPG, GIF até 5MB
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://exemplo.com/logo.png"
          disabled={isUploading}
        />
        <Button type="button" variant="outline" onClick={usarUrlExterna} disabled={isUploading}>
          <LinkIcon className="w-4 h-4 mr-2" />
          Usar link
        </Button>
      </div>
    </div>
  );
}
