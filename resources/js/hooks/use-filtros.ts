import { useEffect, useMemo, useState } from 'react';
import type { Instituicao, Setor, Unidade } from '../types';

export function useFiltros(instituicao: Instituicao, unidades: Unidade[], setores: Setor[]) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstituicao, setSelectedInstituicao] = useState<string>('all');
    const [selectedUnidade, setSelectedUnidade] = useState<string>('all');
    const [filteredUnidades, setFilteredUnidades] = useState<Unidade[]>(unidades);

    useEffect(() => {
        const newFilteredUnidades = instituicao.unidades || [];
        setFilteredUnidades(newFilteredUnidades);
        if (selectedUnidade !== 'all' && !newFilteredUnidades.find((u) => u.id.toString() === selectedUnidade)) {
            setSelectedUnidade('all');
        }
    }, [selectedInstituicao, unidades, selectedUnidade, instituicao.unidades]);

    const filteredSetores = useMemo(() => {
        return setores.filter((setor) => {
            const matchesSearch =
                searchTerm === '' ||
                setor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                setor.sigla.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesInstituicao = selectedInstituicao === 'all' || setor.unidade?.instituicao?.id.toString() === selectedInstituicao;

            const matchesUnidade = selectedUnidade === 'all' || setor.unidade?.id.toString() === selectedUnidade;

            return matchesSearch && matchesInstituicao && matchesUnidade;
        });
    }, [setores, searchTerm, selectedInstituicao, selectedUnidade]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedInstituicao('all');
        setSelectedUnidade('all');
    };

    return {
        searchTerm,
        setSearchTerm,
        selectedInstituicao,
        setSelectedInstituicao,
        selectedUnidade,
        setSelectedUnidade,
        filteredUnidades,
        filteredSetores,
        clearFilters,
    };
}
