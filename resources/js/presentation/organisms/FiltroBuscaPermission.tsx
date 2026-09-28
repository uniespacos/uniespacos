import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTurnoText } from '@/lib/utils';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { Andar, Espaco, Instituicao, Modulo, SelectedAgenda, Unidade } from '@/types';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface FiltroBuscaPermissionProps {
    instituicoes: Instituicao[];
    selectedAgendas: SelectedAgenda[];
    setSelectedAgendas: React.Dispatch<React.SetStateAction<SelectedAgenda[]>>;
}

export default function FiltroBuscaPermission({ instituicoes, selectedAgendas, setSelectedAgendas }: FiltroBuscaPermissionProps) {
    const [localFilters, setLocalFilters] = useState({
        selectedInstituicao: '',
        selectedUnidade: '',
        selectedModulo: '',
        selectedAndar: '',
        selectedEspaco: '',
    });
    const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');
    const [unidades, setUnidades] = useState<Unidade[]>(
        instituicoes.find((i) => i.id.toString() === localFilters.selectedInstituicao)?.unidades || [],
    );
    const [modulos, setModulos] = useState<Modulo[]>(unidades.find((u) => u.id.toString() === localFilters.selectedUnidade)?.modulos || []);
    const [andares, setAndares] = useState<Andar[]>(modulos.find((m) => m.id.toString() === localFilters.selectedModulo)?.andars || []);
    const [espacos, setEspacos] = useState<Espaco[]>(andares.find((a) => a.id.toString() === localFilters.selectedAndar)?.espacos || []);

    const handleFilterChange = (name: keyof typeof localFilters, value: string) => {
        setLocalFilters((prevFilters) => {
            const newFilters = { ...prevFilters, [name]: value };

            if (name === 'selectedInstituicao') {
                newFilters.selectedUnidade = '';
                setUnidades(instituicoes.find((i) => i.id.toString() === value)?.unidades || []);
                newFilters.selectedModulo = '';
                setModulos([]);
                newFilters.selectedAndar = '';
                setAndares([]);
                newFilters.selectedEspaco = '';
                setEspacos([]);
            }
            if (name === 'selectedUnidade') {
                newFilters.selectedModulo = '';
                setModulos(unidades.find((u) => u.id.toString() === value)?.modulos || []);
                newFilters.selectedAndar = '';
                setAndares([]);
                newFilters.selectedEspaco = '';
                setEspacos([]);
            }
            if (name === 'selectedModulo') {
                newFilters.selectedAndar = '';
                setAndares(modulos.find((m) => m.id.toString() === value)?.andars || []);
                newFilters.selectedEspaco = '';
                setEspacos([]);
            }
            if (name === 'selectedAndar') {
                newFilters.selectedEspaco = '';
                setEspacos(andares.find((a) => a.id.toString() === value)?.espacos || []);
            }

            return newFilters;
        });
    };

    const handleAddAgenda = () => {
        setSelectedAgendas((prevSelected) => {
            const agendaId = Number(selectedAgendaId);
            if (!agendaId) return prevSelected;

            const instituicao = instituicoes.find((i) => i.id.toString() === localFilters.selectedInstituicao);
            const unidade = instituicao?.unidades?.find((u) => u.id.toString() === localFilters.selectedUnidade);
            const modulo = unidade?.modulos?.find((m) => m.id.toString() === localFilters.selectedModulo);
            const andar = modulo?.andars?.find((a) => a.id.toString() === localFilters.selectedAndar);
            const espaco = andar?.espacos?.find((e) => e.id.toString() === localFilters.selectedEspaco);
            const agenda = espaco?.agendas?.find((a) => a.id === agendaId);
            if (!espaco || !andar || !modulo || !unidade || !instituicao || !agenda) return prevSelected;

            const isAlreadySelected = prevSelected.some((sa) => sa.agenda.id === agendaId);
            if (isAlreadySelected) return prevSelected;

            const selectedAgenda: SelectedAgenda = {
                agenda,
                espaco,
                andar,
                modulo,
                unidade,
                instituicao,
            };

            return [...prevSelected, selectedAgenda];
        });
        setSelectedAgendaId('');
    };

    const resetForm = () => {
        setLocalFilters({
            selectedInstituicao: '',
            selectedUnidade: 'all',
            selectedModulo: 'all',
            selectedAndar: 'all',
            selectedEspaco: 'all',
        });
        setSelectedAgendaId('');
        setSelectedAgendas([]);
    };

    const handleRemoveAgenda = (agendaId: number) => {
        setSelectedAgendas(selectedAgendas.filter((sa) => sa.agenda.id !== agendaId));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Seleção de Agendas para Gestão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Instituição</Label>
                            <Select
                                value={localFilters.selectedInstituicao}
                                onValueChange={(value) => {
                                    handleFilterChange('selectedInstituicao', value);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a instituição" />
                                </SelectTrigger>
                                <SelectContent>
                                    {instituicoes.map((inst) => (
                                        <SelectItem key={inst.id} value={inst.id.toString()}>
                                            {inst.sigla}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Unidade</Label>
                            <Select
                                value={localFilters.selectedUnidade}
                                onValueChange={(value) => {
                                    handleFilterChange('selectedUnidade', value);
                                }}
                                disabled={!localFilters.selectedInstituicao}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {unidades.map((unidade) => (
                                        <SelectItem key={unidade.id} value={unidade.id.toString()}>
                                            {unidade.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Módulo</Label>
                            <Select
                                value={localFilters.selectedModulo}
                                onValueChange={(value) => {
                                    handleFilterChange('selectedModulo', value);
                                }}
                                disabled={!localFilters.selectedUnidade}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o módulo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {modulos.map((modulo) => (
                                        <SelectItem key={modulo.id} value={modulo.id.toString()}>
                                            {modulo.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Andar</Label>
                            <Select
                                value={localFilters.selectedAndar}
                                onValueChange={(value) => {
                                    handleFilterChange('selectedAndar', value);
                                }}
                                disabled={!localFilters.selectedModulo}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o andar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {andares.map((andar) => (
                                        <SelectItem key={andar.id} value={andar.id.toString()}>
                                            {getAndarLabelByValue(andar.nome)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Espaço</Label>
                            <Select
                                value={localFilters.selectedEspaco}
                                onValueChange={(value) => {
                                    handleFilterChange('selectedEspaco', value);
                                }}
                                disabled={!localFilters.selectedAndar}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o espaço" />
                                </SelectTrigger>
                                <SelectContent>
                                    {espacos.map((espaco) => (
                                        <SelectItem key={espaco.id} value={espaco.id.toString()}>
                                            {espaco.nome} (Cap: {espaco.capacidade_pessoas})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Agenda</Label>
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <Select value={selectedAgendaId} onValueChange={setSelectedAgendaId} disabled={!localFilters.selectedEspaco}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a agenda" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {espacos
                                                .find((e) => e.id.toString() === localFilters.selectedEspaco)
                                                ?.agendas?.map((agenda) => (
                                                    <SelectItem key={agenda.id} value={agenda.id.toString()}>
                                                        Turno: {getTurnoText(agenda.turno)}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddAgenda} disabled={!selectedAgendaId} size="sm">
                                    Adicionar
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={resetForm}>
                            Limpar Seleção
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {selectedAgendas.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Agendas Selecionadas ({selectedAgendas.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {selectedAgendas.map((selectedAgenda) => (
                                <div key={selectedAgenda.agenda.id} className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-1">
                                        <div className="font-medium">
                                            {selectedAgenda.espaco.nome} - {getTurnoText(selectedAgenda.agenda.turno)}
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            {selectedAgenda.instituicao.nome} → {selectedAgenda.unidade.nome} → {selectedAgenda.modulo.nome} →{' '}
                                            {getAndarLabelByValue(selectedAgenda.andar.nome)}
                                        </div>
                                        <Badge variant="outline">Capacidade: {selectedAgenda.espaco.capacidade_pessoas} pessoas</Badge>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            handleRemoveAgenda(selectedAgenda.agenda.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
