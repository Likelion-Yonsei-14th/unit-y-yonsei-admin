export interface BoothMapping {
  id: number;
  date: string;
  location: string;
  boothNumber: string;
  boothName: string;
  organizationName: string;
}

export const mockMappings: BoothMapping[] = [
  { id: 1, date: '2026-05-27', location: '국제캠', boothNumber: '1', boothName: '치킨부스', organizationName: '멋쟁이사자처럼' },
  { id: 2, date: '2026-05-28', location: '백양로', boothNumber: '1', boothName: '타코야끼', organizationName: 'GDSC' },
  { id: 3, date: '2026-05-28', location: '한글탑', boothNumber: '1', boothName: '와플', organizationName: 'UMC' },
];
