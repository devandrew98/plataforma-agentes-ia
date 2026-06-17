# Instruções para Uso no Overleaf - Documentação do TCC

Parabéns! A estrutura completa de arquivos do seu TCC foi desenvolvida e organizada com rigor acadêmico (normas ABNT via pacote `abntex2`), diagramas vetoriais nativos em TikZ e manuais detalhados baseados no código-fonte real do seu projeto.

Os seguintes arquivos foram gerados na pasta `documentacao_tcc` do seu computador:
1. `tcc.tex`: Código principal LaTeX (com diagramas TikZ, citações associadas, código fonte e manual).
2. `referencias.bib`: Base de dados BibTeX com as referências acadêmicas citadas (Vaswani, Lewis, frameworks, etc.).

---

## Como Importar e Compilar no Overleaf

Siga estes passos simples para carregar e compilar seu projeto no Overleaf:

1. **Acessar o Overleaf**:
   - Faça login no site [Overleaf](https://www.overleaf.com/).
   - Abra o projeto existente do seu TCC ou crie um "Novo Projeto" (Vazio).

2. **Carregar os Arquivos**:
   - Clique no ícone de **Upload** no canto superior esquerdo da barra de arquivos do Overleaf.
   - Arraste ou selecione o arquivo `referencias.bib` que criamos.
   - Se preferir, você pode arrastar o arquivo `tcc.tex` completo para substituir o arquivo `.tex` padrão do seu projeto, ou abrir o `tcc.tex` em um editor de texto no seu computador, copiar todo o conteúdo e colar sobre o conteúdo atual do seu arquivo principal no Overleaf.

3. **Verificar a Imagem `exemplo_dialogo.pdf`**:
   - O documento cita uma imagem em `figuras/exemplo_dialogo.pdf`. Certifique-se de que essa pasta `figuras` existe no seu Overleaf e que a imagem do fluxo de conversa correspondente está carregada lá, ou altere a referência no arquivo `.tex` caso utilize outro nome de arquivo.

4. **Compilar o Projeto**:
   - Certifique-se de que o compilador padrão do projeto esteja definido como **pdfLaTeX** (esta é a configuração padrão na maioria dos projetos).
   - Clique no botão verde **Recompile** (ou use o atalho `Ctrl + Enter`).
   - O Overleaf gerará o PDF completo com:
     - Os elementos pré-textuais intactos.
     - O **Diagrama de Arquitetura em TikZ** compilado diretamente em formato vetorial de alta definição.
     - Citações bibliográficas automáticas e corretas ao longo dos capítulos.
     - O **Diagrama de Classes UML em TikZ** no Apêndice A.
     - Os trechos reais de código destacados no Apêndice B.
     - O **Manual de Utilização** detalhado no Anexo A.
     - A lista final de referências no formato ABNT gerada dinamicamente a partir do `referencias.bib`.

---

## O que foi melhorado e adicionado no seu documento?

- **Rigor Científico com Citações**: Inclusão de referências acadêmicas formatadas (`\cite`, `\citeonline`) nos capítulos de fundamentação e metodologia.
- **Gráficos Nativos (TikZ)**: Dois diagramas robustos e bonitos em TikZ que dispensam o upload de imagens PNG/JPG externas e garantem resolução infinita no PDF final.
- **Blocos de Código Inteligentes (`listings`)**: Destaque e numeração profissional de trechos reais do código Python (FastAPI).
- **Manual Técnico**: Elaboração de um manual completo com todos os comandos necessários para rodar o backend, setup do fallback do SQLite para RAG/Embeddings, inicialização do Docker Qdrant e comandos de inicialização do frontend Next.js.
