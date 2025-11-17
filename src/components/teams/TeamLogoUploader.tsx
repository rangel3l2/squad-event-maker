import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImageToImgBB } from "@/services/imgbb";

interface TeamLogoUploaderProps {
  onLogoChange: (logoUrl: string) => void;
  currentLogo?: string;
}

export function TeamLogoUploader({ onLogoChange, currentLogo }: TeamLogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentLogo || "");
  const [isUploading, setIsUploading] = useState(false);

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
        
        // Upload para ImgBB
        const imageUrl = await uploadImageToImgBB(base64String);
        
        onLogoChange(imageUrl);
        setIsUploading(false);
        toast.success("Logo carregado com sucesso!");
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
    toast.info("Logo removido");
  };

  return (
    <div className="space-y-2">
      <Label>Logo do Time *</Label>
      <p className="text-sm text-muted-foreground">
        Arraste uma imagem ou clique para selecionar (máx. 5MB)
      </p>
      
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
    </div>
  );
}