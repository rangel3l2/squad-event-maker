import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Triangle, FabricImage, IText, filters } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  Square, 
  Circle as CircleIcon, 
  Triangle as TriangleIcon,
  Type,
  Trash2,
  Sparkles,
  Upload,
  Save
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function LogoEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#8B5CF6");
  const [teamName, setTeamName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    });

    setFabricCanvas(canvas);
    toast.success("Editor pronto! Comece a criar seu logo!");

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'image') {
      const imageFilters = [
        new filters.Brightness({ brightness: (brightness - 100) / 100 }),
        new filters.Contrast({ contrast: (contrast - 100) / 100 }),
        new filters.Saturation({ saturation: (saturation - 100) / 100 }),
      ];
      (activeObject as FabricImage).filters = imageFilters;
      (activeObject as FabricImage).applyFilters();
      fabricCanvas.renderAll();
    }
  }, [brightness, contrast, saturation, fabricCanvas]);

  const addRectangle = () => {
    if (!fabricCanvas) return;
    const rect = new Rect({
      left: 100,
      top: 100,
      fill: activeColor,
      width: 100,
      height: 100,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    const circle = new Circle({
      left: 100,
      top: 100,
      fill: activeColor,
      radius: 50,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
  };

  const addTriangle = () => {
    if (!fabricCanvas) return;
    const triangle = new Triangle({
      left: 100,
      top: 100,
      fill: activeColor,
      width: 100,
      height: 100,
    });
    fabricCanvas.add(triangle);
    fabricCanvas.setActiveObject(triangle);
    fabricCanvas.renderAll();
  };

  const addText = () => {
    if (!fabricCanvas) return;
    const text = new IText("Texto", {
      left: 100,
      top: 100,
      fill: activeColor,
      fontSize: 40,
      fontFamily: "Arial",
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      toast.success("Objeto removido!");
    }
  };

  const generateWithAI = async () => {
    if (!teamName.trim()) {
      toast.error("Digite o nome do time!");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: { prompt: aiPrompt, teamName }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error("Nenhuma imagem gerada");

      // Add generated image to canvas
      const img = await FabricImage.fromURL(data.imageUrl);
      img.scaleToWidth(400);
      img.set({ left: 200, top: 100 });
      fabricCanvas?.add(img);
      fabricCanvas?.renderAll();

      toast.success("Logo gerado com IA!");
    } catch (error: any) {
      console.error("Error generating logo:", error);
      if (error.message?.includes("429")) {
        toast.error("Limite de requisições atingido. Tente novamente mais tarde.");
      } else if (error.message?.includes("402")) {
        toast.error("Créditos insuficientes. Adicione créditos ao seu workspace.");
      } else {
        toast.error("Erro ao gerar logo com IA");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = await FabricImage.fromURL(event.target?.result as string);
        img.scaleToWidth(400);
        img.set({ left: 200, top: 100 });
        fabricCanvas?.add(img);
        fabricCanvas?.renderAll();
        toast.success("Imagem carregada!");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const downloadLogo = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `${teamName || 'logo'}.png`;
    link.href = dataURL;
    link.click();
    toast.success("Logo baixado!");
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Canvas limpo!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Editor de Logos</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* AI Generation Panel */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Gerar com IA
            </h2>
            
            <div>
              <Label htmlFor="teamName">Nome do Time</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Leões Dourados"
              />
            </div>

            <div>
              <Label htmlFor="aiPrompt">Descrição (opcional)</Label>
              <Input
                id="aiPrompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: com um leão rugindo"
              />
            </div>

            <Button 
              onClick={generateWithAI} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? "Gerando..." : "Gerar Logo com IA"}
            </Button>
          </Card>

          {/* Canvas */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button onClick={addRectangle} variant="outline" size="sm">
                  <Square className="w-4 h-4 mr-2" />
                  Retângulo
                </Button>
                <Button onClick={addCircle} variant="outline" size="sm">
                  <CircleIcon className="w-4 h-4 mr-2" />
                  Círculo
                </Button>
                <Button onClick={addTriangle} variant="outline" size="sm">
                  <TriangleIcon className="w-4 h-4 mr-2" />
                  Triângulo
                </Button>
                <Button onClick={addText} variant="outline" size="sm">
                  <Type className="w-4 h-4 mr-2" />
                  Texto
                </Button>
                <Button onClick={uploadImage} variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button onClick={deleteSelected} variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deletar
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-white">
                <canvas ref={canvasRef} />
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={downloadLogo} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
                <Button onClick={clearCanvas} variant="outline">
                  Limpar
                </Button>
              </div>
            </Card>
          </div>

          {/* Style Panel */}
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Personalização</h2>
            
            <div>
              <Label htmlFor="color">Cor</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={activeColor}
                  onChange={(e) => setActiveColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={activeColor}
                  onChange={(e) => setActiveColor(e.target.value)}
                  placeholder="#8B5CF6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Brilho: {brightness}%</Label>
              <Slider
                value={[brightness]}
                onValueChange={(v) => setBrightness(v[0])}
                min={0}
                max={200}
                step={1}
              />
            </div>

            <div>
              <Label>Contraste: {contrast}%</Label>
              <Slider
                value={[contrast]}
                onValueChange={(v) => setContrast(v[0])}
                min={0}
                max={200}
                step={1}
              />
            </div>

            <div>
              <Label>Saturação: {saturation}%</Label>
              <Slider
                value={[saturation]}
                onValueChange={(v) => setSaturation(v[0])}
                min={0}
                max={200}
                step={1}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
