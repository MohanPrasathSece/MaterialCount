
"use client";

import React from 'react';
import type { Client, Material, ClientMaterialEntry } from '@/lib/types';
import { useEffect, useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '../ui/button';
import { updateClientSheetAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// Type definition for the component's props.
type ClientSheetProps = {
    client: Client;
    materials: Material[];
    clientHistory: ClientMaterialEntry[];
};

const initialState: {
    success: boolean;
    message: string | null;
    errors?: Record<string, string[]> | null;
    submissionId?: number;
} = {
    success: false,
    message: null,
    errors: null,
    submissionId: undefined,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Saving..." : "Save Changes"}
        </Button>
    );
}

export function ClientSheet({ client, materials, clientHistory }: ClientSheetProps) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateClientSheetAction, initialState);
    const lastSubmissionId = useRef(state.submissionId);

    const summary: Map<string, { outQty: number; inQty: number; }> = React.useMemo(() => {
        const summaryMap = new Map<string, { outQty: number; inQty: number; }>();
        materials.forEach(m => summaryMap.set(m.id, { outQty: 0, inQty: 0 }));

        clientHistory.forEach(entry => {
            entry.materials.forEach(item => {
                const current = summaryMap.get(item.materialId) || { outQty: 0, inQty: 0 };
                if (entry.type === 'out') {
                    current.outQty += Number(item.quantity);
                } else {
                    current.inQty += Number(item.quantity);
                }
                summaryMap.set(item.materialId, current);
            });
        });
        return summaryMap;
    }, [materials, clientHistory]);

    const defaultValues = React.useMemo(() => {
        const sortedMaterials = [...materials].sort((a, b) => {
            const categoryOrder: { [key: string]: number } = { 'Wiring': 1, 'Fabrication': 2, 'Other': 3 };
            const categoryA = a.category || 'Other';
            const categoryB = b.category || 'Other';
            if (categoryOrder[categoryA] !== categoryOrder[categoryB]) {
                return categoryOrder[categoryA] - categoryOrder[categoryB];
            }
            return a.name.localeCompare(b.name);
        });

        return {
            clientId: client.id,
            materials: sortedMaterials.map(material => {
                const materialSummary = summary.get(material.id) || { outQty: 0, inQty: 0 };
                return {
                    materialId: material.id,
                    materialName: material.name,
                    category: material.category || 'Other',
                    outQty: materialSummary.outQty,
                    inQty: materialSummary.inQty,
                    originalOut: materialSummary.outQty,
                    originalIn: materialSummary.inQty,
                };
            })
        }
    }, [client.id, materials, summary]);

    const methods = useForm({
        defaultValues,
    });
    
    const { control, formState: { errors }, watch, register, setError, clearErrors, reset } = methods;

    const { fields } = useFieldArray({
        control,
        name: "materials"
    });
    
    useEffect(() => {
        if (state.submissionId !== lastSubmissionId.current) {
            lastSubmissionId.current = state.submissionId;
            clearErrors();

            if (state.success && state.message) {
                toast({ title: "Success", description: state.message });
                
                const newDefaultValues = {
                     ...defaultValues,
                     materials: watch('materials').map( (mat:any) => {
                         return {
                             ...mat,
                             originalOut: mat.outQty,
                             originalIn: mat.inQty,
                         }
                     })
                 };
                reset(newDefaultValues); 
            } else if (!state.success && state.message) {
                toast({ variant: "destructive", title: "Error", description: state.message });
            }
            
            if (state.errors) {
                const fieldErrors = state.errors as Record<string, string[]>;
                Object.keys(fieldErrors).forEach((key) => {
                    const match = key.match(/materials\[(\d+)\]\.(\w+)/);
                    if (match) {
                        const [, indexStr, subField] = match;
                        const index = parseInt(indexStr, 10);
                        if (!isNaN(index) && subField) {
                            setError(`materials.${index}.${subField as 'outQty' | 'inQty'}`, {
                                type: 'server',
                                message: fieldErrors[key][0],
                            });
                        }
                    }
                });
            }
        }
    }, [state, toast, reset, setError, clearErrors, watch, defaultValues]);


    const watchedMaterials = watch("materials");
    let lastCategory: string | null = null;
    
    const renderRow = (field: Record<"id", string>, index: number, isMobile: boolean) => {
        const currentData = watchedMaterials[index];
        const netUsedQty = (currentData?.outQty || 0) - (currentData?.inQty || 0);
        const availableStock = materials.find(m => m.id === currentData.materialId)?.quantity ?? 0;
        const fieldError = errors.materials?.[index];

        const showCategoryHeader = currentData.category !== lastCategory;
        if (showCategoryHeader) {
            lastCategory = currentData.category;
        }

        if (isMobile) {
            return (
                 <React.Fragment key={field.id}>
                    {showCategoryHeader && <h3 className="text-xl font-bold font-headline mt-6 mb-2 underline">{currentData.category}</h3>}
                    <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-bold">{index + 1}. {currentData.materialName}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor={`outQty-mobile-${index}`} className="text-muted-foreground">Out Qty</Label>
                                <Input
                                    id={`outQty-mobile-${index}`}
                                    {...register(`materials.${index}.outQty`)}
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    className="w-full text-center"
                                />
                                {fieldError?.outQty && <p className="text-destructive text-xs mt-1">{fieldError.outQty.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`inQty-mobile-${index}`} className="text-muted-foreground">In Qty</Label>
                                <Input
                                    id={`inQty-mobile-${index}`}
                                    {...register(`materials.${index}.inQty`)}
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    className="w-full text-center"
                                />
                                 {fieldError?.inQty && <p className="text-destructive text-xs mt-1">{fieldError.inQty.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2 rounded-md font-semibold">
                            <div className="flex items-center justify-between"><span className="text-sm">Available:</span><span>{availableStock}</span></div>
                            <div className="flex items-center justify-between"><span className="text-sm">Net Used:</span><span>{netUsedQty}</span></div>
                        </div>
                    </div>
                </React.Fragment>
            )
        }

        return (
            <React.Fragment key={field.id}>
                {showCategoryHeader && (
                     <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="py-2 px-2">
                           <h3 className="text-lg font-bold font-headline underline">{currentData.category}</h3>
                        </TableCell>
                    </TableRow>
                )}
                <TableRow>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-semibold">{currentData.materialName}</TableCell>
                    <TableCell>
                        <Input
                            {...register(`materials.${index}.outQty`)}
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            className="w-24 mx-auto text-center"
                        />
                        {fieldError?.outQty && <p className="text-destructive text-xs mt-1">{fieldError.outQty.message}</p>}
                    </TableCell>
                    <TableCell>
                        <Input
                            {...register(`materials.${index}.inQty`)}
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            className="w-24 mx-auto text-center"
                        />
                        {fieldError?.inQty && <p className="text-destructive text-xs mt-1">{fieldError.inQty.message}</p>}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                        <div className="flex flex-col items-center leading-tight">
                            <span className="text-xs text-muted-foreground">Avail: {availableStock}</span>
                            <span>{netUsedQty}</span>
                        </div>
                    </TableCell>
                </TableRow>
            </React.Fragment>
        )
    }

    return (
        <FormProvider {...methods}>
            <Card>
               <CardHeader>
                     <div className="text-center mb-4">
                        <h1 className="text-2xl font-bold font-headline mb-2">FUTURE ENERGY</h1>
                        <h2 className="text-xl font-semibold">{client.name}</h2>
                        <p className="text-sm text-muted-foreground px-4">{client.address}</p>
                        <p className="text-sm text-muted-foreground">
                            Consumer No: {client.consumerNo} | Plant Capacity: {client.plantCapacity}
                        </p>
                    </div>
                    <CardDescription className="text-center italic px-4">
                        Note: You can only increase the 'Out' and 'In' quantities. To correct a mistake, please contact an administrator.
                    </CardDescription>
               </CardHeader>
                <CardContent>
                    <form ref={formRef} action={formAction} className="space-y-6">
                        <input type="hidden" {...register('clientId')} />
                        {fields.map((field, index) => (
                            <React.Fragment key={field.id}>
                                <input type="hidden" {...register(`materials.${index}.materialId`)} />
                                <input type="hidden" {...register(`materials.${index}.materialName`)} />
                                <input type="hidden" {...register(`materials.${index}.originalOut`)} />
                                <input type="hidden" {...register(`materials.${index}.originalIn`)} />
                                <input type="hidden" {...register(`materials.${index}.category`)} />
                            </React.Fragment>
                        ))}
                        
                        <div className="border rounded-lg hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sr.No</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead className="text-center w-[120px]">Out Qty</TableHead>
                                        <TableHead className="text-center w-[120px]">In Qty</TableHead>
                                        <TableHead className="text-center w-[120px]">Net Used Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => renderRow(field, index, false))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="space-y-4 md:hidden">
                           {fields.map((field, index) => renderRow(field, index, true))}
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <SubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </FormProvider>
    );
}

