import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewUrl(base64String);
      onAvatarChange(base64String);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarTypeChange = (type: "google" | "upload") => {
    if (disabled) return;
    setAvatarType(type);
    if (type === "google" && googleAvatar) {
      onAvatarChange(googleAvatar);
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
