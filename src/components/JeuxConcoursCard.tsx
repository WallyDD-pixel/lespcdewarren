"use client";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function JeuxConcoursCard() {
  const { data } = useSWR('/api/public-config', fetcher, { refreshInterval: 60000 });
  const contest = data?.contest || {};
  const title = contest?.title || 'Jeux concours';
  const imageUrl = contest?.imageUrl || '/jeux-concours.jpg';
  const bgColor = contest?.bgColor || null;

  const style = bgColor ? { background: bgColor } : undefined;

  return (
    <div style={style} className={`rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-white min-h-[320px] ${!bgColor ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500' : ''}`}>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <div className="w-full flex justify-center mb-4">
        <Image
          src={imageUrl}
          alt={title}
          width={320}
          height={180}
          className="rounded-lg object-cover shadow-md"
        />
      </div>
      <p className="mb-4 text-center text-base">Participez à notre jeu concours et tentez de gagner des lots exceptionnels !</p>
  <Link href="/register?next=/jeux-concours/participer" className="btn-primary px-5 py-2 rounded-full font-semibold text-base">Participer</Link>
    </div>
  );
}
