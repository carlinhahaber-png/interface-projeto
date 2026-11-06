// Créditos do rodapé. Para mudar nomes, funções ou a linha do projeto, edite só este arquivo.
export interface Credit {
  name: string;
  github: string; // usuário do GitHub (perfil e foto)
  role: string;
}

export const CREDITS: Credit[] = [
  // O espaço no começo de role é proposital: faz parte do HTML combinado para o cartão.
  { name: "Antônio Prado Horta", github: "Titanio112", role: " FullStack, OCR e Infraestrutura" },
  { name: "Carla Haber", github: "carlinhahaber-png", role: "Interface web (frontend)" },
];

export const PROJECT_LINE = "Projeto de Iniciação Científica · CEFET-MG, Campus Varginha";
