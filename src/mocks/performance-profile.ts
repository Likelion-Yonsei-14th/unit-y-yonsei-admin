/**
 * Performer 권한 사용자의 "내 공연팀" mock.
 * 백엔드 붙으면 useMyPerformance() 훅이 이 자리를 대체.
 */

export interface SetlistItem {
  id: number;
  order: number;
  songName: string;
  artist: string;
}

export interface PerformanceImage {
  id: number;
  url: string;
  isMain: boolean;
}

export interface PerformanceData {
  teamName: string;
  description: string;
  instagramUrl: string;
  youtubeUrl: string;
  startTime: string;
  endTime: string;
}

export const mockPerformanceData: PerformanceData = {
  teamName: '멋쟁이사자처럼 연세대',
  description: '연세대학교 IT 창업 동아리 멋쟁이사자처럼입니다. 2024년 대동제에서 열정적인 무대를 선보이겠습니다!',
  instagramUrl: 'https://instagram.com/likelion_yonsei',
  youtubeUrl: 'https://youtube.com/likelion',
  startTime: '14:00',
  endTime: '14:30',
};

export const mockSetlist: SetlistItem[] = [
  { id: 1, order: 1, songName: 'Spring Day', artist: 'BTS' },
  { id: 2, order: 2, songName: 'Next Level', artist: 'aespa' },
];
