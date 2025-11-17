import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";

interface CodeViewerProps {
  url: string;
  type: "html" | "css";
  title: string;
}

export default function CodeViewer({ url, type, title }: CodeViewerProps) {
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const response = await fetch(url);
        const text = await response.text();
        setCode(text);
      } catch (error) {
        console.error("Erro ao carregar código:", error);
        setCode("// Erro ao carregar o código");
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [url]);

  const lines = code.split("\n");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${type === "html" ? "bg-accent" : "bg-secondary"}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full">
          <div className="bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs">
            {loading ? (
              <div className="p-4">Carregando código...</div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="hover:bg-[#2a2a2a]">
                      <td className="text-right pr-4 pl-4 py-1 text-[#858585] select-none border-r border-[#3e3e3e] bg-[#1e1e1e] sticky left-0 min-w-[50px]">
                        {index + 1}
                      </td>
                      <td className="pl-4 pr-4 py-1 whitespace-pre">{line || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
