export function formatDateFromString(dateStr: string): string {
    if (!dateStr) return '';
    // aceita "YYYY-MM-DD" e ISO datetime "YYYY-MM-DDTHH:mm:ss..." (descarta a hora)
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '';
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}