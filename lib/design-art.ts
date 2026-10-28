export const designArt = [
  { id: "star", name: "Star", category: "Shapes", paths: ["M50 5 61 35 94 36 68 57 77 89 50 71 23 89 32 57 6 36 39 35Z"] },
  { id: "heart", name: "Heart", category: "Shapes", paths: ["M50 89C35 73 8 56 8 32 8 8 38 4 50 25 62 4 92 8 92 32 92 56 65 73 50 89Z"] },
  { id: "lightning", name: "Lightning", category: "Shapes", paths: ["M55 3 13 57 43 57 35 97 87 39 56 39 68 3Z"] },
  { id: "diamond", name: "Diamond", category: "Shapes", paths: ["M50 4 96 50 50 96 4 50Z"] },
  { id: "chevron", name: "Chevron", category: "Shapes", paths: ["M5 15 50 45 95 15 95 45 50 78 5 45Z"] },
  { id: "shield", name: "Shield", category: "Sports", paths: ["M50 4 89 18 86 57Q81 82 50 97 19 82 14 57L11 18ZM50 15 22 25 25 55Q29 73 50 84 71 73 75 55L78 25Z"] },
  { id: "trophy", name: "Trophy", category: "Sports", paths: ["M26 7H74V34Q74 55 56 61V78H72V91H28V78H44V61Q26 55 26 34ZM15 18H25V28H17Q17 45 30 45V55Q5 55 5 18ZM75 18H95Q95 55 70 55V45Q83 45 83 28H75Z"] },
  { id: "basketball", name: "Basketball", category: "Sports", paths: ["M50 4A46 46 0 1 0 50 96A46 46 0 1 0 50 4ZM45 15V45H15Q17 33 25 25L38 38 42 32 31 20Q38 16 45 15ZM55 15Q63 16 70 20L58 32 63 38 76 25Q84 33 85 45H55ZM15 55H45V85Q38 84 31 80L42 68 38 62 25 75Q17 67 15 55ZM55 55H85Q83 67 76 75L63 62 58 68 70 80Q62 84 55 85Z"] },
  { id: "ball", name: "Football", category: "Sports", paths: ["M50 4A46 46 0 1 0 50 96A46 46 0 1 0 50 4ZM50 14 63 21 59 39 41 39 37 21ZM17 30 33 31 38 47 27 59 13 54ZM83 30 87 54 73 59 62 47 67 31ZM31 66 47 61 57 75 49 88 29 80ZM69 66 80 73 65 85 58 79Z"] },
  { id: "mountains", name: "Mountains", category: "Outdoors", paths: ["M2 88 35 25 52 55 68 12 98 88ZM21 76H43L35 57ZM56 76H80L68 45Z"] },
  { id: "pine", name: "Pine tree", category: "Outdoors", paths: ["M50 3 24 37H36L15 62H32L8 86H43V98H57V86H92L68 62H85L64 37H76Z"] },
  { id: "sun", name: "Sun", category: "Outdoors", paths: ["M50 25A25 25 0 1 0 50 75A25 25 0 1 0 50 25ZM46 2H54V18H46ZM46 82H54V98H46ZM2 46H18V54H2ZM82 46H98V54H82ZM14 19 20 13 31 25 25 31ZM69 75 75 69 87 81 81 87ZM14 81 25 69 31 75 20 87ZM69 25 81 13 87 19 75 31Z"] },
] as const;

export const designFonts = ["Arial", "Arial Black", "Verdana", "Trebuchet MS", "Tahoma", "Georgia", "Times New Roman", "Courier New", "Impact", "Comic Sans MS"];
export const textShapes = ["straight", "arch-up", "arch-down", "wave", "circle"] as const;

export function artExists(id: string) { return designArt.some((art) => art.id === id); }
