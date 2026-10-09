import { Link } from "react-router-dom";

const highlights = [
  { number: "01", title: "Treino individual", description: "Pratica ao teu ritmo, escolhe a duração e acompanha velocidade, precisão e consistência." },
  { number: "02", title: "Partidas multiplayer", description: "Cria uma sala pública ou privada, convida amigos e compete em corrida ou eliminação." },
  { number: "03", title: "Progresso e comunidade", description: "Consulta o ranking, acompanha as tuas partidas e desbloqueia conquistas à medida que jogas." },
];

export function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 md:py-16">
      <section className="relative overflow-hidden rounded-2xl border border-accent/25 bg-surface/50 p-7 md:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-accent/5 blur-3xl" />
        <p className="relative font-mono text-xs uppercase tracking-[0.25em] text-accent">Sobre o projeto</p>
        <h1 className="relative mt-4 max-w-3xl font-mono text-4xl leading-tight text-text md:text-6xl">Rei do clique<span className="text-accent">.</span></h1>
        <p className="relative mt-5 max-w-2xl text-base leading-7 text-sub md:text-lg">Um jogo de digitação para treinar velocidade e precisão — sozinho ou numa partida com outras pessoas.</p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link to="/" className="rounded-lg bg-accent px-5 py-3 font-mono text-sm text-bg transition-opacity hover:opacity-90">Começar a jogar</Link>
          <Link to="/multiplayer" className="rounded-lg border border-sub/25 px-5 py-3 font-mono text-sm text-text transition-colors hover:border-accent/50 hover:text-accent">Ver multiplayer</Link>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mb-6 max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">O que podes fazer</p>
          <h2 className="mt-2 font-mono text-2xl text-text md:text-3xl">Treina. Compete. Evolui.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.number} className="rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
              <span className="font-mono text-xs text-accent">{item.number}</span>
              <h3 className="mt-4 font-mono text-lg text-text">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-sub">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-sub/15 py-10 md:py-12">
        <div className="mb-6 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Os teus resultados</p>
          <h2 className="mt-2 font-mono text-2xl text-text md:text-3xl">WPM, precisão e pontos</h2>
          <p className="mt-2 text-sm leading-6 text-sub">Cada indicador mostra uma parte diferente do teu desempenho.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5">
            <h3 className="font-mono text-lg text-accent">WPM</h3>
            <p className="mt-2 text-sm leading-6 text-sub">Palavras por minuto. O jogo considera uma palavra como cinco caracteres e calcula a velocidade com base nos caracteres corretos.</p>
          </article>
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5">
            <h3 className="font-mono text-lg text-accent">Precisão</h3>
            <p className="mt-2 text-sm leading-6 text-sub">Percentagem de caracteres corretos entre todos os caracteres escritos. Quanto maior, menos erros cometeste.</p>
          </article>
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5">
            <h3 className="font-mono text-lg text-accent">ELO</h3>
            <p className="mt-2 text-sm leading-6 text-sub">Pontos usados no ranking multiplayer. Sobem ou descem conforme a tua posição e a força relativa dos adversários.</p>
          </article>
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5">
            <h3 className="font-mono text-lg text-accent">XP e nível</h3>
            <p className="mt-2 text-sm leading-6 text-sub">Ganhos ao jogar. A velocidade contribui para o XP e terminar numa boa posição dá bónus. Ao acumular XP, sobes de nível.</p>
          </article>
        </div>
      </section>

      <section className="grid gap-8 border-t border-sub/15 py-10 md:grid-cols-[1fr_1fr] md:py-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Como funciona</p>
          <h2 className="mt-2 font-mono text-2xl text-text">Uma partida em poucos passos</h2>
        </div>
        <ol className="space-y-4 text-sm leading-6 text-sub">
          <li className="flex gap-3"><span className="font-mono text-accent">1.</span><span>Escolhe o modo e configura o teu treino, ou abre o multiplayer.</span></li>
          <li className="flex gap-3"><span className="font-mono text-accent">2.</span><span>Escreve o texto apresentado com rapidez e atenção à precisão.</span></li>
          <li className="flex gap-3"><span className="font-mono text-accent">3.</span><span>Vê os resultados e acompanha a tua evolução no perfil.</span></li>
        </ol>
      </section>

      <section className="grid gap-4 border-t border-sub/15 py-10 sm:grid-cols-2 md:py-12">
        <article className="rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Desenvolvimento</p>
          <h2 className="mt-2 font-mono text-lg text-text">Feito por um dev independente</h2>
          <a href="https://portfolio-m7sj.onrender.com" target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm text-accent hover:underline">Conhece o portfólio do dev <span aria-hidden="true" className="ml-1">↗</span></a>
        </article>
        <article className="rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Apoio</p>
          <h2 className="mt-2 font-mono text-lg text-text">Startup apoiadora</h2>
          <p className="mt-3 text-sm text-sub">Transfortech</p>
        </article>
      </section>

      <section className="mb-8 rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Inspiração e crédito</p>
        <h2 className="mt-2 font-mono text-lg text-text">Inspirado no Monkeytype</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sub">O Rei do Clique é um projeto independente inspirado no Monkeytype e na sua experiência de treino de digitação. O Monkeytype é uma referência importante para este projeto; não existe afiliação entre os dois.</p>
      </section>

      <section className="rounded-xl border border-sub/15 bg-surface/35 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Plano Pro</p>
            <h2 className="mt-2 font-mono text-xl text-text">Mais espaço para jogar em grupo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-sub">As salas Free permitem até 4 jogadores. Com Pro, podes configurar salas com até 20 jogadores. Para pedir upgrade, fala connosco pelo WhatsApp nas Definições.</p>
          </div>
          <Link to="/settings" className="shrink-0 rounded-lg border border-accent/40 px-4 py-2.5 text-center font-mono text-xs text-accent transition-colors hover:bg-accent/5">Ver planos</Link>
        </div>
      </section>

      <section className="mt-12 border-t border-sub/15 pt-10 md:mt-16 md:pt-12">
        <div className="mb-6 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Novidades</p>
          <h2 className="mt-2 font-mono text-2xl text-text md:text-3xl">O que há de novo</h2>
          <p className="mt-2 text-sm leading-6 text-sub">Este espaço resume as funcionalidades e alterações relevantes do Rei do Clique.</p>
        </div>
        <div className="space-y-4">
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
            <p className="font-mono text-xs text-accent">Outubro de 2026</p>
            <h3 className="mt-2 font-mono text-lg text-text">Torneios com 8 ou 16 participantes</h3>
            <p className="mt-2 text-sm leading-6 text-sub">Utilizadores Free podem inscrever-se em torneios abertos de 8 ou 16 participantes. Cada confronto é uma partida entre dois jogadores. Criar torneios está disponível nos planos Pro e Team.</p>
          </article>
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
            <p className="font-mono text-xs text-accent">Gestão de torneios</p>
            <h3 className="mt-2 font-mono text-lg text-text">Controlos para o anfitrião</h3>
            <p className="mt-2 text-sm leading-6 text-sub">Enquanto as inscrições estão abertas, o anfitrião pode remover participantes ou cancelar o torneio. Depois do início, os resultados das partidas determinam as eliminações.</p>
          </article>
          <article className="rounded-xl border border-sub/15 bg-surface/35 p-5 md:p-6">
            <p className="font-mono text-xs text-accent">Personalização</p>
            <h3 className="mt-2 font-mono text-lg text-text">Temas e notificações</h3>
            <p className="mt-2 text-sm leading-6 text-sub">A aplicação permite escolher o tema visual. O ícone de notificações acompanha as cores do tema ativo.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
