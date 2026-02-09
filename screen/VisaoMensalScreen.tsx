// screen/VisaoMensalScreen.js

import React, { useState } from 'react';
import { 
    SafeAreaView, View, Text, ScrollView, TouchableOpacity, 
    StyleSheet
} from 'react-native';

const COLORS = {
    BACKGROUND_LIGHT: '#ffffff',
    HEADER_BG: '#f8f8f8',
    TEXT_DARK: '#333333',
    TEXT_MUTED: '#666666',
    GRID_LINE: '#eeeeee',
    BUTTON_PRIMARY: '#4a61dd',
    ACCENT_SCHEDULE: '#2196f3', // Azul para Agendamentos
};

// Fallback caso a lista de meses não venha no "data"
const DEFAULT_MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// --- Funções Utilitárias de Data ---

function parseDateAnyFormat(dateVal) {
    if (!dateVal) return new Date('Invalid Date');
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal === 'string' && dateVal.includes('/')) {
        const [d, m, y] = dateVal.split('/').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateVal); // ISO format YYYY-MM-DD
}

export default function VisaoMensalScreen({ data, schedules = [], onBack }) { 
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const handlePrevYear = () => setCurrentYear(prev => prev - 1);
    const handleNextYear = () => setCurrentYear(prev => prev + 1);

    // Proteção: usa a lista padrão se 'months' não vier
    const { months = DEFAULT_MONTHS } = data || {}; 

    // --- Filtrar Agendamentos (Férias Marcadas) ---
    const monthlySchedules = Array.from({ length: 12 }, () => []);
    
    if (Array.isArray(schedules)) {
        schedules.forEach(sch => {
            const startDateObj = parseDateAnyFormat(sch.startDate);
            // Verifica data válida e ano atual
            if (!isNaN(startDateObj.getTime()) && startDateObj.getFullYear() === currentYear) {
                const startMonth = startDateObj.getMonth();
                monthlySchedules[startMonth].push(sch);
            }
        });
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* CABEÇALHO */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Visão Mensal {currentYear}</Text>
            </View>
            
            {/* NAVEGAÇÃO DE ANO */}
            <View style={styles.yearNav}>
                <TouchableOpacity onPress={handlePrevYear} style={styles.yearBtn}>
                    <Text style={styles.yearBtnText}>{'<<'}</Text>
                </TouchableOpacity>
                <Text style={styles.currentYearText}>{currentYear}</Text>
                <TouchableOpacity onPress={handleNextYear} style={styles.yearBtn}>
                    <Text style={styles.yearBtnText}>{'>>'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {months.map((m, idx) => (
                    <View key={m} style={styles.monthSection}>
                        <Text style={styles.monthTitle}>{m}</Text>
                        
                        {/* CARD DE AGENDAMENTOS */}
                        <View style={[styles.card, styles.schCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitleSch}>FÉRIAS MARCADAS</Text>
                                <View style={[styles.badge, { backgroundColor: COLORS.ACCENT_SCHEDULE }]}>
                                    <Text style={styles.badgeText}>{monthlySchedules[idx]?.length || 0}</Text>
                                </View>
                            </View>
                            {(!monthlySchedules[idx] || monthlySchedules[idx].length === 0) ? (
                                <Text style={styles.emptyText}>Nenhum agendamento.</Text>
                            ) : (
                                monthlySchedules[idx].map((sch, i) => (
                                    <View key={i} style={styles.itemLine}>
                                        <Text style={styles.itemName}>{sch.employeeName}</Text>
                                        <Text style={styles.itemDetail}>{sch.startDate} → {sch.durationDays} dias</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND_LIGHT },
    header: { 
        padding: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.HEADER_BG, 
        borderBottomWidth: 1, 
        borderColor: COLORS.GRID_LINE 
    },
    backButton: { backgroundColor: COLORS.BUTTON_PRIMARY, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    backButtonText: { color: '#FFF', fontWeight: 'bold' },
    title: { fontSize: 18, fontWeight: 'bold', color: COLORS.TEXT_DARK, marginLeft: 15 },
    
    yearNav: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 10, 
        backgroundColor: '#FFF', 
        gap: 30,
        borderBottomWidth: 1,
        borderColor: COLORS.GRID_LINE
    },
    yearBtn: { padding: 10 },
    yearBtnText: { fontSize: 20, fontWeight: 'bold', color: COLORS.BUTTON_PRIMARY },
    currentYearText: { fontSize: 22, fontWeight: '900', color: COLORS.TEXT_DARK },

    scrollContent: { padding: 15 },
    monthSection: { marginBottom: 25 },
    monthTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.TEXT_DARK, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: COLORS.BUTTON_PRIMARY, paddingLeft: 10 },
    
    card: { 
        backgroundColor: '#FFF', 
        borderRadius: 10, 
        padding: 12, 
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.GRID_LINE,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    // Removi styles.vencCard
    schCard: { borderTopWidth: 3, borderTopColor: COLORS.ACCENT_SCHEDULE },
    
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardTitleSch: { fontSize: 12, fontWeight: 'bold', color: COLORS.ACCENT_SCHEDULE },
    
    badge: { borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    
    emptyText: { color: COLORS.TEXT_MUTED, fontSize: 12, fontStyle: 'italic' },
    itemLine: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.GRID_LINE },
    itemName: { fontSize: 14, fontWeight: '600', color: COLORS.TEXT_DARK },
    itemDetail: { fontSize: 12, color: COLORS.TEXT_MUTED }
});