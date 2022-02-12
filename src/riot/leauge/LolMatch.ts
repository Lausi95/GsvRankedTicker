
export enum Position {
  ADC = 'ADC',
  SUPPORT = 'Support',
  MID = 'Mid',
  JUNGLE = 'Jungler',
  TOP = 'Top',
  UNDEFINED = '???',
}

export type LolMatchParticipant = {
  playerId: string,
  win: boolean,
  position: Position,
  champion: string,
  cs: number,
  penta: boolean,
  gold: number,
  kills: number,
  deaths: number,
  assists: number,
  visionScore: number,
  wardsPlaces: number,
  damageDealt: number,
  damageTaken: number,
  objectiveDamage: number,
  healingDone: number,
}

export type LolMatch = {
  id: number,
  time: number,
  duration: number,
  participants: LolMatchParticipant[],
}
