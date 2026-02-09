import React, { useState, useRef, useMemo } from 'react';
import {
    SafeAreaView, View, Text, TextInput, TouchableOpacity,
    FlatList, ScrollView, StyleSheet, Modal, Switch
} from 'react-native';

const COLORS = {
    BG: '#f4f7f6', HEADER: '#f8f8f8', LINE: '#eeeeee',
    TEXT: '#333', MUTED: '#666', HOJE: '#dcebff',
    VACATION: '#ff5c8a', WORK: '#e3f2fd', OFF: '#f5f5f5',  
    PRIMARY: '#4a61dd', SAVE: '#4CAF50', VIEW: '#00c7b7', DELETE: '#E53935',
    ABONO: '#673AB7', CARD_BG: '#ffffff',
    FERISTA_WORK: '#555555', // Cor para os dias de "ponte/transição"
    FERISTA_OFF: '#ffffff'
};

const DAY_WIDTH = 50; 
const ROW_HEIGHT = 60; 

const ANCHORS = {
    'A': new Date(2025, 11, 27),
    'B': new Date(2025, 11, 29),
    'C': new Date(2025, 11, 31),
    'D': new Date(2026, 0, 2)
};

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

function parseSafeDate(dateVal) {
    if (!dateVal) return null;
    let d;
    if (typeof dateVal === 'string') {
        const cleanDate = dateVal.substring(0, 10);
        if (cleanDate.includes('-')) {
            const [y, m, d_] = cleanDate.split('-').map(Number);
            d = new Date(y, m - 1, d_);
        } else if (cleanDate.includes('/')) {
            const [d_, m, y] = cleanDate.split('/').map(Number);
            d = new Date(y, m - 1, d_);
        }
    } else { d = new Date(dateVal); }
    if (!d || isNaN(d.getTime())) return null;
    d.setHours(0,0,0,0);
    return d;
}

const formatDateKey = (date) => {
    try { return date.toISOString().split('T')[0]; } catch (e) { return ''; }
};

export default function HomeScreen({ 
    employees, schedules, feristaData = {}, 
    onOpenRegister, onOpenMonthly, onOpenSchedule, onDeleteSchedules 
}) {
    const [search, setSearch] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null); 
    const [showConfirmDelete, setShowConfirmDelete] = useState(false); 
    const [isTimelineView, setIsTimelineView] = useState(true); 

    const headerScrollRef = useRef(null);
    const gridScrollRef = useRef(null);

    // --- OTIMIZAÇÃO: MAPA DE COBERTURA ---
    // Cria um mapa rápido para saber quem está de férias em qual dia
    // Ex: { '2026-06-25': 'B', '2026-06-26': 'B' }
    const coverageMap = useMemo(() => {
        const map = {};
        (schedules || []).forEach(sch => {
            const start = parseSafeDate(sch.startDate);
            const end = parseSafeDate(sch.endDate);
            const emp = employees.find(e => e.id === sch.employeeId);
            
            if (start && end && emp && emp.letra !== 'Ferista') {
                let curr = new Date(start);
                while (curr <= end) {
                    const k = formatDateKey(curr);
                    map[k] = emp.letra; // Guarda a letra de quem está de férias
                    curr.setDate(curr.getDate() + 1);
                }
            }
        });
        return map;
    }, [schedules, employees]);

    const getEmployeeData = (empId) => {
        return (employees || []).find(e => e.id === empId) || { letra: 'A', status: true };
    };

    const getStatusEDatas = (startDateStr, durationDays, empId) => {
        const start = parseSafeDate(startDateStr);
        if (!start) return { saida: '--', retorno: '--', fim: '--' };
        const emp = getEmployeeData(empId);
        
        // Usa a função auxiliar de cálculo de escala
        const getDayType = (date) => {
            const style = calculateStandardScaleColor(date, emp.letra);
            return style.backgroundColor === COLORS.MUTED ? 'TRABALHO' : 'FOLGA';
        };

        let saida = new Date(start);
        saida.setDate(saida.getDate() - 1);
        while (getDayType(saida) === 'FOLGA') saida.setDate(saida.getDate() - 1);
        saida.setDate(saida.getDate() + 1);

        const fim = new Date(start);
        fim.setDate(fim.getDate() + (parseInt(durationDays) - 1));
        let retorno = new Date(fim);
        retorno.setDate(retorno.getDate() + 1);
        while (getDayType(retorno) === 'FOLGA') retorno.setDate(retorno.getDate() + 1);

        const fmt = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        return { saida: fmt(saida), retorno: fmt(retorno), fim: fmt(fim) };
    };

    // Função auxiliar pura para calcular a cor 4x4 baseada na letra
    const calculateStandardScaleColor = (targetDate, letra) => {
        const anchor = ANCHORS[letra] || ANCHORS['A'];
        const diffTime = targetDate.getTime() - anchor.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const cycleDay = ((diffDays % 8) + 8) % 8;
        return { backgroundColor: cycleDay < 4 ? COLORS.MUTED : COLORS.OFF };
    };

    // --- NOVA LÓGICA DE ESTILO DA CÉLULA ---
    const getScaleStyle = (targetDate, emp) => {
        // 1. SE FOR FERISTA
        if (emp.letra === 'Ferista' || (emp.nome && emp.nome.toUpperCase().includes('FERISTA'))) {
            const dateKey = formatDateKey(targetDate);
            
            // A. Verifica se ele está cobrindo alguém (Prioridade Alta)
            // Se tem alguém de férias neste dia, o Ferista ASSUME A ESCALA dessa pessoa
            const letraCoberta = coverageMap[dateKey];
            if (letraCoberta) {
                return calculateStandardScaleColor(targetDate, letraCoberta);
            }

            // B. Verifica se é dia de Transição (Gap entre férias)
            const feristaInfo = feristaData ? feristaData[dateKey] : null;
            if (feristaInfo) {
                if (feristaInfo.tipo === 'TRABALHO') return { backgroundColor: COLORS.FERISTA_WORK };
                if (feristaInfo.tipo === 'FOLGA') return { backgroundColor: COLORS.FERISTA_OFF };
            }

            // C. Padrão (Sem cobertura, sem transição)
            return { backgroundColor: COLORS.OFF };
        }

        // 2. SE FOR FUNCIONÁRIO NORMAL
        return calculateStandardScaleColor(targetDate, emp.letra || 'A');
    };

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    };

    const timelineDays = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        d.setDate(d.getDate() + i);
        return d;
    });

    const filteredSchedules = (schedules || []).filter(s => {
        const emp = getEmployeeData(s.employeeId);
        if (emp.status === false) return false;
        const matchesSearch = s.employeeName?.toLowerCase().includes(search.toLowerCase());
        const dS = parseSafeDate(s.startDate);
        const matchesDate = dS && (dS.getMonth() === currentDate.getMonth() || dS.getMonth() === currentDate.getMonth() + 1);
        return matchesSearch && matchesDate;
    });

    const employeesFiltered = (employees || []).filter(e => 
        e.status === true && e.nome?.toLowerCase().includes(search.toLowerCase())
    );

    const handleGridScroll = (event) => {
        const x = event.nativeEvent.contentOffset.x;
        if (headerScrollRef.current) {
            headerScrollRef.current.scrollTo({ x, animated: false });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- MODAIS IGUAIS --- */}
            <Modal visible={showMonthPicker || showYearPicker} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => {setShowMonthPicker(false); setShowYearPicker(false);}}>
                    <View style={styles.modalContent}>
                        {(showMonthPicker ? MONTHS : YEARS).map((item, i) => (
                            <TouchableOpacity key={item} style={styles.modalItem} onPress={() => {
                                if (showMonthPicker) setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
                                else setCurrentDate(new Date(item, currentDate.getMonth(), 1));
                                setShowMonthPicker(false); setShowYearPicker(false);
                            }}>
                                <Text style={styles.modalText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
            <Modal visible={!!editingSchedule && !showConfirmDelete} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setEditingSchedule(null)}>
                    <View style={styles.editModalContent}>
                        <Text style={styles.editModalTitle}>Opções do Agendamento</Text>
                        {editingSchedule && (
                            <View style={styles.infoRowModal}>
                                {(() => {
                                    const info = getStatusEDatas(editingSchedule.startDate, editingSchedule.durationDays, editingSchedule.employeeId);
                                    return (
                                        <>
                                            <View style={styles.detailBox}><Text style={[styles.infoLabel, {color: COLORS.PRIMARY}]}>SAÍDA</Text><Text style={styles.infoValue}>{info.saida}</Text></View>
                                            <View style={styles.detailDivider} />
                                            <View style={styles.detailRow}>
                                                <View style={styles.detailItem}><Text style={styles.infoLabel}>INÍCIO</Text><Text style={styles.infoValue}>{editingSchedule.startDate}</Text></View>
                                                <View style={styles.detailItem}><Text style={styles.infoLabel}>RETORNO</Text><Text style={[styles.infoValue, {color: COLORS.SAVE}]}>{info.retorno}</Text></View>
                                            </View>
                                        </>
                                    );
                                })()}
                            </View>
                        )}
                        <TouchableOpacity style={[styles.editBtn, {backgroundColor: '#FF9800', marginBottom: 10}]} onPress={() => { const data = editingSchedule; setEditingSchedule(null); onOpenSchedule(data); }}><Text style={styles.btnT}>EDITAR</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.editBtn, {backgroundColor: COLORS.DELETE}]} onPress={() => setShowConfirmDelete(true)}><Text style={styles.btnT}>EXCLUIR</Text></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            <Modal visible={showConfirmDelete} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Confirmar Exclusão?</Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: COLORS.LINE}]} onPress={() => setShowConfirmDelete(false)}><Text>NÃO</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: COLORS.DELETE}]} onPress={async () => { if (onDeleteSchedules && editingSchedule) { await onDeleteSchedules([editingSchedule.id]); } setShowConfirmDelete(false); setEditingSchedule(null); }}><Text style={styles.btnT}>SIM, EXCLUIR</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* --- HEADER --- */}
            <View style={styles.mainHeader}>
                <View>
                    <Text style={styles.mainTitle}>Equipe Turnão</Text>
                    <Text style={styles.mainSub}>{MONTHS[currentDate.getMonth()]} de {currentDate.getFullYear()}</Text>
                </View>
                <Switch value={isTimelineView} onValueChange={setIsTimelineView} trackColor={{ false: "#ddd", true: COLORS.PRIMARY }} />
            </View>

            <View style={styles.topBar}>
                <View style={styles.navRow}>
                    <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(-1)}><Text style={styles.arrowText}>◀</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowMonthPicker(true)}><Text style={styles.dateDisplayText}>{MONTHS[currentDate.getMonth()]}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowYearPicker(true)}><Text style={styles.dateDisplayText}>{currentDate.getFullYear()}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(1)}><Text style={styles.arrowText}>▶</Text></TouchableOpacity>
                </View>
                <TextInput placeholder="Buscar Balanceiro..." style={styles.input} onChangeText={setSearch} value={search} />
            </View>

            <View style={{ flex: 1 }}> 
                {isTimelineView ? (
                    <>
                        <View style={styles.stickyHeaderContainer}>
                            <View style={styles.namesHeaderCorner}><Text style={{fontSize: 10, color: COLORS.MUTED, fontWeight: 'bold'}}>BALANCEIROS</Text></View>
                            <ScrollView horizontal ref={headerScrollRef} scrollEnabled={false} showsHorizontalScrollIndicator={false} style={styles.headerScroll}>
                                <View style={styles.daysHeader}>
                                    {timelineDays.map(d => (
                                        <View key={d.getTime()} style={styles.dayBox}>
                                            <Text style={styles.dayLabel}>{String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}</Text>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                        <ScrollView style={{flex: 1}} contentContainerStyle={{flexGrow: 1}}>
                            <View style={styles.mainTimelineContainer}>
                                <View style={styles.namesColumn}>
                                    {employeesFiltered.map(item => (
                                        <View key={item.id} style={styles.nameRow}>
                                            <Text style={styles.nameText} numberOfLines={1}>{item.nome}</Text>
                                            <Text style={{fontSize: 8, color: COLORS.PRIMARY}}>{item.letra === 'Ferista' ? 'FERISTA' : `Letra ${item.letra}`}</Text>
                                        </View>
                                    ))}
                                </View>
                                <ScrollView horizontal ref={gridScrollRef} style={styles.gridScroll} onScroll={handleGridScroll} scrollEventThrottle={16}>
                                    <View>
                                        {employeesFiltered.map(emp => (
                                            <View key={emp.id} style={styles.row}>
                                                {timelineDays.map(d => <View key={d.getTime()} style={[styles.cell, getScaleStyle(d, emp)]} />)}
                                                {(schedules || []).filter(s => s.employeeId === emp.id).map(sch => {
                                                    const start = parseSafeDate(sch.startDate); const end = parseSafeDate(sch.endDate);
                                                    if (!start || !end) return null;
                                                    let startIdx = timelineDays.findIndex(d => d.getTime() === start.getTime());
                                                    let endIdx = timelineDays.findIndex(d => d.getTime() === end.getTime());
                                                    if (endIdx === -1 && end < timelineDays[0]) return null;
                                                    if (startIdx === -1 && start > timelineDays[timelineDays.length - 1]) return null;
                                                    const effStart = startIdx === -1 ? 0 : startIdx;
                                                    const effEnd = endIdx === -1 ? timelineDays.length - 1 : endIdx;
                                                    return (
                                                        <TouchableOpacity key={sch.id} onPress={() => setEditingSchedule(sch)} style={[styles.bar, { left: effStart * DAY_WIDTH, width: (effEnd - effStart + 1) * DAY_WIDTH, backgroundColor: COLORS.VACATION }]}>
                                                            <Text style={styles.barText} numberOfLines={1}>FÉRIAS</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </ScrollView>
                    </>
                ) : (
                    <FlatList data={filteredSchedules} keyExtractor={item => item.id} contentContainerStyle={{ padding: 15 }} renderItem={({ item }) => {
                        const info = getStatusEDatas(item.startDate, item.durationDays, item.employeeId);
                        const emp = getEmployeeData(item.employeeId);
                        return (
                            <View style={styles.card}>
                                <View style={[styles.statusIndicator, { backgroundColor: COLORS.PRIMARY }]} />
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <View><Text style={styles.empName}>{item.employeeName}</Text><Text style={{fontSize: 10, color: COLORS.PRIMARY, fontWeight: 'bold'}}>Letra {emp.letra}</Text></View>
                                        <TouchableOpacity onPress={() => setEditingSchedule(item)}><Text style={{fontSize: 18}}>⚙️</Text></TouchableOpacity>
                                    </View>
                                    <View style={styles.datesGrid}>
                                        <View style={styles.dateBlock}><Text style={styles.dateLabel}>SAÍDA</Text><Text style={[styles.dateValue, {color: COLORS.PRIMARY}]}>{info.saida}</Text></View>
                                        <View style={styles.dateBlock}><Text style={styles.dateLabel}>INÍCIO</Text><Text style={styles.dateValue}>{item.startDate}</Text></View>
                                        <View style={styles.dateBlock}><Text style={styles.dateLabel}>RETORNO</Text><Text style={[styles.dateValue, {color: COLORS.SAVE}]}>{info.retorno}</Text></View>
                                    </View>
                                </View>
                            </View>
                        );
                    }} />
                )}
            </View>
            <View style={styles.footer}>
                <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.PRIMARY}]} onPress={onOpenRegister}><Text style={styles.btnT}>+ Func</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.SAVE}]} onPress={() => onOpenSchedule(null)}><Text style={styles.btnT}>Agendar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.VIEW}]} onPress={onOpenMonthly}><Text style={styles.btnT}>Mensal</Text></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BG },
    mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.LINE },
    mainTitle: { fontSize: 20, fontWeight: 'bold' },
    mainSub: { fontSize: 12, color: COLORS.MUTED },
    topBar: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.LINE },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 5 },
    arrowBtn: { padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: COLORS.LINE },
    arrowText: { color: COLORS.PRIMARY, fontWeight: 'bold' },
    dateDisplay: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: COLORS.LINE, justifyContent: 'center', alignItems: 'center' },
    dateDisplayText: { color: COLORS.PRIMARY, fontWeight: 'bold', fontSize: 13 },
    input: { borderWidth: 1, borderColor: COLORS.LINE, padding: 10, borderRadius: 8, backgroundColor: '#f9f9f9' },
    stickyHeaderContainer: { flexDirection: 'row', height: 40, borderBottomWidth: 1, borderColor: COLORS.LINE, backgroundColor: COLORS.HEADER, zIndex: 10 },
    namesHeaderCorner: { width: 140, borderRightWidth: 1, borderColor: COLORS.LINE, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    headerScroll: { flex: 1 },
    mainTimelineContainer: { flexDirection: 'row' },
    namesColumn: { width: 140, borderRightWidth: 1, borderColor: COLORS.LINE, backgroundColor: '#fff', zIndex: 5 },
    gridScroll: { flex: 1 },
    nameRow: { height: ROW_HEIGHT, padding: 5, borderBottomWidth: 1, borderColor: COLORS.LINE, justifyContent: 'center' },
    nameText: { fontWeight: 'bold', fontSize: 12 },
    daysHeader: { flexDirection: 'row', height: 40, backgroundColor: COLORS.HEADER }, 
    dayBox: { width: DAY_WIDTH, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: COLORS.LINE },
    dayLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.TEXT }, 
    row: { height: ROW_HEIGHT, flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.LINE, position: 'relative' },
    cell: { width: DAY_WIDTH, height: '100%', borderRightWidth: 1, borderColor: COLORS.LINE },
    bar: { position: 'absolute', height: 30, top: (ROW_HEIGHT - 30) / 2, borderRadius: 4, justifyContent: 'center', alignItems: 'center', zIndex: 10, opacity: 0.9 },
    barText: { color: '#fff', fontSize: 9, fontWeight: 'bold', paddingHorizontal: 2 },
    card: { backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, flexDirection: 'row', elevation: 3 },
    statusIndicator: { width: 6, borderTopLeftRadius: 15, borderBottomLeftRadius: 15 },
    cardContent: { flex: 1, padding: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    empName: { fontSize: 16, fontWeight: 'bold' },
    datesGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f5f5f5' },
    dateBlock: { alignItems: 'center' },
    dateLabel: { fontSize: 8, fontWeight: 'bold', color: COLORS.MUTED },
    dateValue: { fontSize: 12, fontWeight: 'bold' },
    footer: { padding: 10, flexDirection: 'row', gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: COLORS.LINE },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    btnT: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', width: '40%', borderRadius: 12, padding: 10 },
    modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.LINE },
    modalText: { textAlign: 'center', fontSize: 16 },
    editModalContent: { backgroundColor: '#fff', width: '85%', borderRadius: 20, padding: 25, alignItems: 'center' },
    editModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    infoRowModal: { backgroundColor: COLORS.HEADER, padding: 15, borderRadius: 15, width: '100%', marginBottom: 20 },
    detailBox: { alignItems: 'center', paddingVertical: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    detailItem: { alignItems: 'center', flex: 1 },
    detailDivider: { height: 1, backgroundColor: '#f0f0f0', width: '100%' },
    infoLabel: { fontSize: 8, fontWeight: 'bold', color: COLORS.MUTED, marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.TEXT },
    editBtn: { width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
    confirmBox: { backgroundColor: '#fff', width: '80%', padding: 20, borderRadius: 15, alignItems: 'center' },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.DELETE, marginBottom: 20 },
    confirmActions: { flexDirection: 'row', gap: 10 },
    confirmBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' }
});