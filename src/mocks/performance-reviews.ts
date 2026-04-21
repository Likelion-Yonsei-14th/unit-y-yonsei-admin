export interface Review {
  id: number;
  performanceTeam: string;
  favoriteSong: string;
  message: string;
  createdAt: string;
  isHidden: boolean;
}

export const mockReviews: Review[] = [
  { id: 1, performanceTeam: '밴드 A', favoriteSong: '여름밤의 꿈', message: '정말 멋진 공연이었습니다! 특히 여름밤의 꿈은 감동적이었어요. 다음에도 꼭 보고 싶습니다!', createdAt: '2026-05-27 14:30', isHidden: false },
  { id: 2, performanceTeam: '댄스팀 B', favoriteSong: 'Break Free', message: '에너지 넘치는 무대 너무 좋았어요! 댄서분들 모두 멋졌습니다 👏', createdAt: '2026-05-27 15:45', isHidden: false },
  { id: 3, performanceTeam: '밴드 A', favoriteSong: 'Starlight', message: 'Starlight 최고! 앵콜 한 번 더 해주세요!', createdAt: '2026-05-27 16:20', isHidden: false },
  { id: 4, performanceTeam: '보컬팀 C', favoriteSong: '달빛', message: '목소리 정말 좋으세요. 계속 활동 응원합니다!', createdAt: '2026-05-28 13:10', isHidden: false },
  { id: 5, performanceTeam: '댄스팀 B', favoriteSong: 'Dynamite', message: 'Dynamite 무대 찢었다!! 대박!', createdAt: '2026-05-28 14:50', isHidden: false },
];
