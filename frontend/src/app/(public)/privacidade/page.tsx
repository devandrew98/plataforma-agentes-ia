import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — ARgent.ai",
  description: "Política de Privacidade da plataforma ARgent.ai.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300">
          ← Voltar para o início
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-white">Política de Privacidade</h1>
        <p className="mb-10 text-sm text-zinc-500">Última atualização: 18 de junho de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. Quem somos</h2>
            <p>
              A <strong>ARgent.ai</strong> é uma plataforma que permite criar, treinar e publicar
              agentes de inteligência artificial, conectando-os a canais de atendimento como chat
              web e WhatsApp. Esta política descreve como tratamos os dados de quem usa a plataforma
              e de quem conversa com os agentes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. Dados que coletamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Dados de conta:</strong> nome, e-mail e, opcionalmente, empresa e telefone.</li>
              <li><strong>Conteúdo criado:</strong> agentes, prompts, bases de conhecimento e fluxos.</li>
              <li><strong>Conversas:</strong> mensagens trocadas com os agentes, para gerar respostas e histórico.</li>
              <li><strong>Dados de integração:</strong> tokens e identificadores de canais que você conecta (ex.: WhatsApp), usados apenas para operar a integração.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Como usamos os dados</h2>
            <p>
              Utilizamos os dados para autenticar usuários, operar os agentes, gerar respostas de IA,
              manter o histórico de conversas e melhorar a plataforma. Não vendemos seus dados a
              terceiros.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. Compartilhamento</h2>
            <p>
              Compartilhamos dados apenas com provedores necessários para o funcionamento do serviço
              (por exemplo, provedores de modelos de IA e de mensageria, como a Meta/WhatsApp), e
              somente na medida necessária para entregar a funcionalidade solicitada.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">5. Retenção e segurança</h2>
            <p>
              Mantemos os dados enquanto sua conta estiver ativa ou conforme necessário para prestar o
              serviço. Adotamos medidas razoáveis de segurança, como autenticação por token e
              isolamento de dados por usuário.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">6. Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
              entrando em contato pelo e-mail abaixo. A exclusão da conta remove os agentes, bases e
              conversas associadas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">7. Contato</h2>
            <p>
              Dúvidas sobre esta política? Fale com a gente em{" "}
              <a href="mailto:argente.ia@microsoft.com" className="text-indigo-400 hover:text-indigo-300">
                argente.ia@microsoft.com
              </a>
              .
            </p>
          </section>

          <p className="border-t border-zinc-800 pt-6 text-xs text-zinc-600">
            Esta plataforma é um projeto acadêmico (TCC). Os dados são tratados exclusivamente para
            fins de demonstração e operação dos agentes.
          </p>
        </div>
      </div>
    </div>
  );
}
