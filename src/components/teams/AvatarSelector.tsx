import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { uploadImageToImgBB } from "@/services/imgbb";
import { toast } from "sonner";

interface AvatarSelectorProps {
  currentAvatar?: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  disabled?: boolean;
}

export function AvatarSelector({ currentAvatar, onAvatarChange, disabled = false }: AvatarSelectorProps) {
  const { user } = useAuth();
  const [avatarType, setAvatarType] = useState<"google" | "upload">("google");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  // Upload automático da imagem do Google ao montar o componente
  useEffect(() => {
    const uploadGoogleAvatar = async () => {
      if (googleAvatar && !currentAvatar && avatarType === "google") {
        setIsUploading(true);
        try {
          const response = await fetch(googleAvatar);
          const blob = await response.blob();
          
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
              const imageUrl = await uploadImageToImgBB(base64String);
              onAvatarChange(imageUrl);
            } catch (error) {
              console.error("Erro no upload automático:", error);
            } finally {
              setIsUploading(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Erro ao processar imagem do Google:", error);
          setIsUploading(false);
        }
      }
    };

    uploadGoogleAvatar();
  }, [googleAvatar, currentAvatar, avatarType, onAvatarChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setPreviewUrl(base64String);
        
        try {
          // Fazer upload para ImgBB e obter apenas a URL
          const imageUrl = await uploadImageToImgBB(base64String);
          
          // Retornar apenas a URL, não o base64
          onAvatarChange(imageUrl);
          toast.success("Foto carregada com sucesso!");
        } catch (error) {
          console.error("Erro ao fazer upload da foto:", error);
          toast.error("Erro ao carregar foto. Tente novamente.");
          setPreviewUrl("");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo.");
      setIsUploading(false);
    }
  };

  const handleAvatarTypeChange = async (type: "google" | "upload") => {
    if (disabled) return;
    setAvatarType(type);
    if (type === "google" && googleAvatar) {
      setIsUploading(true);
      try {
        // Converter a imagem do Google para base64 e fazer upload para ImgBB
        console.log("Fazendo upload da imagem do Google para ImgBB...");
        const response = await fetch(googleAvatar);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          try {
            const imageUrl = await uploadImageToImgBB(base64String);
            console.log("Upload da imagem do Google bem-sucedido:", imageUrl);
            onAvatarChange(imageUrl);
            toast.success("Foto do Google carregada!");
          } catch (error) {
            console.error("Erro ao fazer upload da foto do Google:", error);
            toast.error("Erro ao carregar foto do Google.");
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Erro ao processar imagem do Google:", error);
        toast.error("Erro ao processar imagem.");
        setIsUploading(false);
      }
    }
  };

  const displayAvatar = avatarType === "google" 
    ? googleAvatar 
    : (previewUrl || currentAvatar);

  return (
    <div className="space-y-4">
      <Label>Foto de Perfil</Label>
      
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={displayAvatar || ""} alt="Avatar" />
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <RadioGroup
          value={avatarType}
          onValueChange={(value) => handleAvatarTypeChange(value as "google" | "upload")}
          className="flex-1"
        >
          {googleAvatar && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="google" id="google" disabled={disabled} />
              <Label htmlFor="google" className={disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                Usar foto do Google
              </Label>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="upload" id="upload" disabled={disabled} />
            <Label htmlFor="upload" className={disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
              Fazer upload de outra foto
            </Label>
          </div>
        </RadioGroup>
      </div>

      {avatarType === "upload" && (
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading || disabled}
            className="cursor-pointer"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {isUploading ? "Fazendo upload..." : "Formatos aceitos: PNG, JPG, GIF"}
          </p>
        </div>
      )}
    </div>
  );
}
