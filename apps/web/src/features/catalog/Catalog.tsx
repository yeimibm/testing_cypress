import { formatMoney, type Product } from '@coffee/shared';

const descriptions: Record<string, string> = {
  espresso: 'Intenso, aromático y con una crema delicada. Nuestro clásico esencial.',
  latte: 'Espresso y leche cremosa. Un equilibrio suave para disfrutar sin prisa.',
  mocha: 'Café, leche y un toque de chocolate. Una pausa para consentirte.',
};

function CoffeeArtwork({ variant }: { variant: string }) {
  const isLatte = variant === 'latte';
  return <svg viewBox="0 0 200 160" fill="none" aria-hidden="true">
    <ellipse cx="100" cy="138" rx="65" ry="9" fill="#464331" opacity=".08" />
    <ellipse cx="100" cy="129" rx="63" ry="11" fill="#fffdf6" />
    <ellipse cx="100" cy="127" rx="48" ry="6" fill="#dfdacf" />
    <path d="M142 70h10c28 0 23 41-4 41h-10" stroke="#faf8ef" strokeWidth="12" />
    <path d="M48 58h98l-7 49c-3 21-20 25-41 25s-39-5-42-25L48 58Z" fill={isLatte ? '#f6f3e9' : '#344b3c'} />
    <path d="m56 79 5 29c2 10 13 15 22 16" stroke={isLatte ? '#dedacc' : '#526747'} strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="97" cy="58" rx="49" ry="15" fill={isLatte ? '#fffdf5' : '#4c634d'} />
    <ellipse cx="97" cy="58" rx="42" ry="11" fill={isLatte ? '#bb9363' : '#3b2518'} />
    {isLatte ? <><path d="M97 64c-4-7-23-9-19-13 4-4 12 2 19 5 7-3 16-9 19-5 4 4-14 6-19 13Z" fill="#f8eedb" /><path d="M97 64v-12" stroke="#f8eedb" strokeWidth="2" /></> : <ellipse cx="97" cy="56" rx="34" ry="7" stroke="#b58a48" strokeWidth="3" opacity=".8" />}
    <path d="M82 36c-13-12 13-14 0-26m29 26c-13-12 13-14 0-26" stroke="#a79f87" strokeWidth="2" strokeLinecap="round" opacity=".6" />
  </svg>;
}

export function Catalog({ products, busy, onAdd }: {
  products: Product[]; busy: boolean; onAdd: (productId: string) => void;
}) {
  return <section aria-labelledby="catalog-heading">
    <div className="section-heading"><h2 id="catalog-heading">Nuestra carta</h2><span>{products.length} productos · Precios en Q</span></div>
    {products.length === 0 ? <p className="loading">Todavía no hay productos en el catálogo.</p> : <div className="catalog-grid">
      {products.map((product) => <article key={product.id} className={`product-card${product.available ? '' : ' is-unavailable'}`} data-cy={`product-${product.id}`}>
        <div className={`product-art ${product.id}`}>
          <span className={`product-status${product.available ? '' : ' unavailable'}`}>{product.available ? 'Preparado al momento' : 'No disponible'}</span>
          <CoffeeArtwork variant={product.id} />
        </div>
        <div className="product-info">
          <h3>{product.name}</h3>
          <p className="product-description">{descriptions[product.id] ?? 'Tu próxima pausa favorita, preparada con dedicación.'}</p>
          <div className="product-bottom"><span className="product-price">{formatMoney(product.priceMinor)}</span>
            <button className="add-button" type="button" disabled={!product.available || busy} aria-label={`Agregar ${product.name}`} onClick={() => onAdd(product.id)} data-cy={`add-${product.id}`}><span className="plus" aria-hidden="true">+</span> Agregar</button>
          </div>
        </div>
      </article>)}
    </div>}
  </section>;
}
