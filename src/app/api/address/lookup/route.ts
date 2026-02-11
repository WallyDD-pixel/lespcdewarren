export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    if (!q || q.trim().length < 2) return new Response(JSON.stringify({ ok: true, suggestions: [] }), { status: 200 });
    const params = new URLSearchParams({ q: q.trim(), limit: '8' });
  const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`);
    if (!resp.ok) return new Response(JSON.stringify({ ok: false, error: 'Service unavailable' }), { status: 502 });
    const data = await resp.json();
    const suggestions = (data?.features || []).map((f: any) => {
      const props = f.properties || {};
      return {
        label: props.label,
        id: f.id,
        postcode: props.postcode,
        city: props.city,
        street: props.name,
        housenumber: props.housenumber,
        context: props.context,
        type: props.type,
      };
    });
    return new Response(JSON.stringify({ ok: true, suggestions }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
