import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Termos de Uso · Observatório' };

/**
 * Sign-in page at /termos.
 */
export default function Termspage(){
  return (
    <div className="px-gutter py-section mx-auto w-full max-w-2xl">
      <p className="font-led text-led-text text-xl">4710-10</p>
      <h1 className="font-display text-4xl font-extrabold">Termos de Uso · Observatório</h1>

	  <section>
	  <h2>O que é o observatório cidadão</h2>
	  <p>Este observatório serve para acessar dados dos ônibus da cidade de São Paulo</p>
	  </section>

	  <section>
	  <h2>O que você pode e não pode fazer fazer</h2>
	  <p>Relatos reais/relatos falsos</p>
	  </section>

	  <section>
	  <h2>Os dados vem da SP trans</h2>
	  <p>São dados públicos e podem ter lacunass</p>
	  </section>

	  <section>
	  <h2>Denúncia facilitada</h2>
	  <h3>Como fazer sua denúncia facilitada para o portal 156 de um ônibus que não passou ou de uma linha que sempre atrasa</h3>
	  <p>pesquise os dados e clique em denúncia facilitada...</p>
	  <h3>Por que fazer a denúncia facilitada</h3>
	  <p>ajuda a reclamação e melhora do transporte em potencial mas nao podemos garantir a resposta/melhoria, isso depende da sp trabs</p>
	  </section>

	  <section>
	  <h2>última atualização</h2>
	  <p>21 novembro 2026. 20:14</p>
	  </section>
    </div>
  );
}
