import Image from '@/assets/espaco.png'; // Placeholder image for empty previews
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormCadastroValues } from '@/presentation/pages/Administrativo/Espacos/CadastroEspaco';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
export interface ImageWithPreview {
    file: File;
    preview: string;
}

interface ImageUploadProps {
    imagesWithPreviews: ImageWithPreview[];
    setImagesWithPreviews: React.Dispatch<React.SetStateAction<ImageWithPreview[]>>;
    mainImageIndex: number | undefined;
    setMainImageIndex: (index: number) => void;
    setImagesToDelete: (path: string) => void;
    processing: boolean;
    errors: { imagens?: string };
    setData: ReturnType<typeof useForm<FormCadastroValues>>['setData'];
}

const MAX_IMAGENS = 5;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUpload({
    imagesWithPreviews,
    setImagesWithPreviews,
    mainImageIndex,
    setData,
    setImagesToDelete,
    processing,
    errors,
    setMainImageIndex,
}: ImageUploadProps) {
    const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImagePreviews: ImageWithPreview[] = [];
        const newImageFiles: File[] = [];
        let vagasRestantes = MAX_IMAGENS - imagesWithPreviews.length;

        Array.from(files).forEach((file) => {
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                toast.warning(`Arquivo ${file.name} não é um tipo de imagem aceito (use JPEG, PNG ou WEBP).`);
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.warning(`Arquivo ${file.name} excede o limite de 5MB.`);
                return;
            }
            if (vagasRestantes <= 0) {
                toast.warning(`Você pode enviar no máximo ${String(MAX_IMAGENS)} imagens.`);
                return;
            }
            newImagePreviews.push({ file, preview: URL.createObjectURL(file) });
            newImageFiles.push(file);
            vagasRestantes -= 1;
        });

        setImagesWithPreviews((prev) => {
            const updatedPreviews = [...prev, ...newImagePreviews];
            setData((prevData: FormCadastroValues) => ({ ...prevData, imagens: updatedPreviews.map((p) => p.file) }));
            if (mainImageIndex === undefined && updatedPreviews.length > 0) {
                setData((prevData: FormCadastroValues) => ({ ...prevData, main_image_index: 0 }));
            }
            return updatedPreviews;
        });
    };

    const handleRemoveImage = (index: number) => {
        const removedImage = imagesWithPreviews[index];
        setImagesToDelete(removedImage.preview);
        URL.revokeObjectURL(removedImage.preview);

        const updatedPreviews = imagesWithPreviews.filter((_, i) => i !== index);
        setImagesWithPreviews(updatedPreviews);
        setData((prevData: FormCadastroValues) => ({ ...prevData, imagens: updatedPreviews.map((p) => p.file) }));

        if (mainImageIndex !== undefined) {
            if (index === mainImageIndex) {
                setData((prevData: FormCadastroValues) => ({ ...prevData, main_image_index: updatedPreviews.length > 0 ? 0 : undefined }));
            } else if (index < mainImageIndex) {
                setData((prevData: FormCadastroValues) => ({ ...prevData, main_image_index: mainImageIndex - 1 }));
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="images">Imagens do Espaço</Label>
                <Input
                    id="images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImagesUpload}
                    disabled={processing || imagesWithPreviews.length >= MAX_IMAGENS}
                />
                {errors.imagens && <p className="text-destructive-accent mt-1 text-sm">{errors.imagens}</p>}
            </div>

            {imagesWithPreviews.length > 0 ? (
                <div className="mt-4">
                    <h4 className="mb-2 text-sm font-medium">Imagens selecionadas:</h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {imagesWithPreviews.map((img, index) => (
                            <div key={index} className="group relative">
                                <div
                                    className={`aspect-square overflow-hidden rounded-md border ${
                                        mainImageIndex === index ? 'ring-primary border-primary ring-2' : 'bg-muted/50'
                                    }`}
                                >
                                    <img src={img.preview || Image} alt={`Imagem ${String(index + 1)}`} className="h-full w-full object-cover" />
                                    {mainImageIndex === index && (
                                        <div className="bg-primary text-primary-foreground absolute top-0 left-0 rounded-br px-1.5 py-0.5 text-xs">
                                            Principal
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -top-2 -right-2 flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="bg-background h-6 w-6 rounded-full shadow-md"
                                        onClick={() => {
                                            setMainImageIndex(index);
                                        }}
                                        disabled={processing || mainImageIndex === index}
                                        title="Definir como imagem principal"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-warning-accent h-3 w-3"
                                        >
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6 rounded-full opacity-90 shadow-md text-destructive-accent hover:text-destructive-accent"
                                        onClick={() => {
                                            handleRemoveImage(index);
                                        }}
                                        disabled={processing}
                                    >
                                        <X className="h-3 w-3 text-destructive-accent" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <Alert>
                    <AlertDescription>Adicione imagens do espaço. Tamanho máximo: 5MB por imagem.</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
