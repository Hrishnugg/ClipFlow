/**
 * Utility function to format video titles consistently across the application.
 * Format: "Student Name (student.email@example.com) MM/DD/YYYY"
 * 
 * @param studentName - The name of the student
 * @param studentEmail - The email of the student
 * @param date - The date object or ISO string to format
 * @returns Formatted video title string
 */
export function formatVideoTitle(
  studentName: string,
  studentEmail: string,
  date: Date | string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  
  return `${studentName} (${studentEmail}) ${formattedDate}`;
}
