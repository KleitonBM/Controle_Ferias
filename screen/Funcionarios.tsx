import React, { useState } from 'react';
import { 
    View, Text, TextInput, Alert, TouchableOpacity, 
    StyleSheet, SafeAreaView, FlatList, Modal, ScrollView 
} from 'react-native';

const COLORS = {
    BG: '#f4f7f6',
    CARD_BG: '#ffffff',
    PRIMARY: '#4a61dd',
    SAVE: '#4CAF50',
    CANCEL: '#666666',
    LINE: '#eeeeee',
    TEXT: '#333',
    MUTED: '#666',
    VACATION: '#ff5c8a',
    EDIT: '#FF9800',
    ACTIVE: '#4CAF50',
    INACTIVE: '#E53935',
    FERISTA: '#7E57C2' // Cor roxa para diferenciar visualmente o Ferista
};

// Mantivemos apenas as letras aqui para o loop da primeira linha
const LETRAS = ['A', 'B', 'C', 'D'];

export default function Funcionarios({ employees = [], schedules = [], onSave, onUpdate, onBack }) {
    const [search, setSearch] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showVacationModal, setShowVacationModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Estados para o formulário (Pop-up)
    const [nome, setNome] = useState('');
    const [matricula, setMatricula] = useState('');
    const [admissao, setAdmissao] = useState('');
    const [statusAtivo, setStatusAtivo] = useState(true);
    const [letra, setLetra] = useState('A'); // Pode assumir 'A', 'B', 'C', 'D' ou 'Ferista'

    const openAddModal = () => {
        resetForm();
        setIsEditing(false);
        setShowFormModal(true);
    };

    const openEditModal = (emp) => {
        setSelectedEmp(emp);
        setNome(emp.nome);
        setMatricula(emp.matricula);
        setAdmissao(emp.admissao);
        setStatusAtivo(emp.status === true); 
        setLetra(emp.letra || 'A');
        setIsEditing(true);
        setShowFormModal(true);
    };

    const openVacations = (emp) => {
        setSelectedEmp(emp);
        setShowVacationModal(true);
    };

    const resetForm = () => {
        setNome('');
        setMatricula('');
        setAdmissao('');
        setStatusAtivo(true);
        setLetra('A');
        setSelectedEmp(null);
    };

    const handleSave = () => {
        if (!nome || !matricula || admissao.length !== 10) {
            Alert.alert("Erro", "Preencha todos os campos corretamente.");
            return;
        }

        const payload = { 
            nome, 
            matricula, 
            admissao, 
            status: statusAtivo, 
            letra // Aqui vai salvar 'A', 'B'... ou 'Ferista'
        };

        if (isEditing && selectedEmp) {
            onUpdate({ ...payload, id: selectedEmp.id });
        } else {
            onSave(payload);
        }
        setShowFormModal(false);
        resetForm();
    };

    const filteredEmployees = (employees || []).filter((e) => 
        e.nome?.toLowerCase().includes(search.toLowerCase()) ||
        e.matricula?.toString().includes(search)
    );

    const renderEmployee = ({ item }) => (
        <View style={styles.empCard}>
            <View style={{ flex: 1 }}>
                <View style={styles.rowAlign}>
                    <Text style={styles.empName}>{item.nome}</Text>
                    <View style={[styles.badge, { backgroundColor: item.status ? COLORS.ACTIVE : COLORS.INACTIVE }]}>
                        <Text style={styles.badgeText}>{item.status ? 'Ativo' : 'Inativo'}</Text>
                    </View>
                    
                    {/* Badge extra se for Ferista para facilitar visualização na lista */}
                    {item.letra === 'Ferista' && (
                        <View style={[styles.badge, { backgroundColor: COLORS.FERISTA }]}>
                            <Text style={styles.badgeText}>FERISTA</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.empDetails}>Mat: {item.matricula} | Escala: {item.letra || 'A'}</Text>
            </View>
            <View style={styles.empActions}>
                <TouchableOpacity onPress={() => openVacations(item)} style={styles.actionBtn}>
                    <Text style={{ fontSize: 18 }}>📅</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                    <Text style={{ fontSize: 18 }}>📝</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>◀ Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Gestão de Colaboradores</Text>
            </View>

            {/* Barra de Pesquisa */}
            <View style={styles.searchBarContainer}>
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Pesquisar..." 
                    value={search}
                    onChangeText={setSearch}
                />
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Text style={styles.addButtonText}>+ Novo</Text>
                </TouchableOpacity>
            </View>

            <FlatList 
                data={filteredEmployees}
                keyExtractor={item => item.id.toString()}
                renderItem={renderEmployee}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum funcionário encontrado.</Text>}
            />

            {/* MODAL DE CADASTRO / EDIÇÃO */}
            <Modal visible={showFormModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>{isEditing ? "Editar" : "Cadastrar"} Colaborador</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Nome Completo</Text>
                            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome" />
                            
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Matrícula</Text>
                                    <TextInput style={styles.input} value={matricula} onChangeText={setMatricula} keyboardType="numeric" />
                                </View>
                                <View style={{ width: 10 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Admissão</Text>
                                    <TextInput style={styles.input} value={admissao} onChangeText={setAdmissao} placeholder="DD/MM/AAAA" maxLength={10} />
                                </View>
                            </View>

                            <Text style={styles.label}>Grupo de Escala</Text>
                            
                            {/* LINHA 1: LETRAS A, B, C, D */}
                            <View style={styles.optionRow}>
                                {LETRAS.map(l => (
                                    <TouchableOpacity 
                                        key={l} 
                                        style={[styles.optionBtn, letra === l && styles.optionBtnActive]} 
                                        onPress={() => setLetra(l)}
                                    >
                                        <Text style={[styles.optionText, letra === l && styles.optionTextActive]}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* LINHA 2: BOTÃO DEDICADO AO FERISTA */}
                            <TouchableOpacity 
                                style={[styles.feristaBtn, letra === 'Ferista' && styles.feristaBtnActive]} 
                                onPress={() => setLetra('Ferista')}
                            >
                                <Text style={[styles.optionText, letra === 'Ferista' && styles.optionTextActive]}>
                                    FERISTA (Volante)
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.label}>Status do Colaborador</Text>
                            <View style={styles.optionRow}>
                                <TouchableOpacity 
                                    style={[styles.statusToggle, statusAtivo && styles.btnAtivo]} 
                                    onPress={() => setStatusAtivo(true)}
                                >
                                    <Text style={[styles.optionText, statusAtivo && styles.optionTextActive]}>Ativo</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.statusToggle, !statusAtivo && styles.btnInativo]} 
                                    onPress={() => setStatusAtivo(false)}
                                >
                                    <Text style={[styles.optionText, !statusAtivo && styles.optionTextActive]}>Inativo</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.CANCEL }]} onPress={() => setShowFormModal(false)}>
                                    <Text style={styles.btnT}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.SAVE }]} onPress={handleSave}>
                                    <Text style={styles.btnT}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL HISTÓRICO FÉRIAS (MANTIDO IGUAL) */}
            <Modal visible={showVacationModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Histórico: {selectedEmp?.nome}</Text>
                        <ScrollView style={{ maxHeight: 300, marginVertical: 15 }}>
                            {(schedules || []).filter(s => s.employeeId === selectedEmp?.id).map((vac) => (
                                <View key={vac.id} style={styles.vacationItem}>
                                    <View style={styles.vacationIndicator} />
                                    <View>
                                        <Text style={styles.vacDate}>{vac.startDate} até {vac.endDate}</Text>
                                        <Text style={styles.vacInfo}>{vac.durationDays} dias</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.PRIMARY }]} onPress={() => setShowVacationModal(false)}>
                            <Text style={styles.btnT}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BG },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.LINE },
    backButton: { backgroundColor: COLORS.PRIMARY, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    backButtonText: { color: '#FFF', fontWeight: 'bold' },
    title: { fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
    searchBarContainer: { flexDirection: 'row', padding: 15, gap: 10 },
    searchInput: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.LINE },
    addButton: { backgroundColor: COLORS.SAVE, paddingHorizontal: 15, borderRadius: 10, justifyContent: 'center' },
    addButtonText: { color: '#fff', fontWeight: 'bold' },
    empCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginHorizontal: 20, elevation: 2 },
    rowAlign: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    empName: { fontSize: 15, fontWeight: 'bold' },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    empDetails: { fontSize: 12, color: COLORS.MUTED, marginTop: 4 },
    empActions: { flexDirection: 'row', gap: 12 },
    actionBtn: { padding: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 25, padding: 25, maxHeight: '80%' },
    modalHeader: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: COLORS.MUTED, marginBottom: 5, marginTop: 15 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: COLORS.LINE, padding: 12, borderRadius: 10 },
    row: { flexDirection: 'row' },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    
    // Botões das Letras (A, B, C, D)
    optionBtn: { width: '22%', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.LINE, alignItems: 'center' },
    optionBtnActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
    
    // Novo Botão do Ferista (Largo)
    feristaBtn: { width: '100%', marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.LINE, alignItems: 'center', borderStyle: 'dashed' },
    feristaBtnActive: { backgroundColor: COLORS.FERISTA, borderColor: COLORS.FERISTA, borderStyle: 'solid' },

    optionText: { fontWeight: 'bold', color: COLORS.TEXT },
    optionTextActive: { color: '#fff' },
    statusToggle: { width: '48%', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.LINE, alignItems: 'center' },
    btnAtivo: { backgroundColor: COLORS.ACTIVE, borderColor: COLORS.ACTIVE },
    btnInativo: { backgroundColor: COLORS.INACTIVE, borderColor: COLORS.INACTIVE },
    modalFooter: { flexDirection: 'row', gap: 10, marginTop: 30 },
    btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    btnT: { color: '#fff', fontWeight: 'bold' },
    vacationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 8 },
    vacationIndicator: { width: 4, height: 20, backgroundColor: COLORS.VACATION, marginRight: 12, borderRadius: 2 },
    vacDate: { fontSize: 13, fontWeight: 'bold' },
    vacInfo: { fontSize: 11, color: COLORS.MUTED },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 10 }
});