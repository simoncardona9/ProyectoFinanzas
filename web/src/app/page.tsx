export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950 sm:px-10">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 sm:p-12">
        <p className="text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
          Finanzas Familiares
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          Control financiero para el hogar
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          Accede de forma segura a la información de tu hogar desde un solo
          lugar.
        </p>
        <a
          href="/login"
          className="mt-7 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white"
        >
          Ingresar
        </a>
      </section>
    </main>
  );
}
