export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-gray-900 to-gray-800 text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          Smart Trashcans
        </h1>
        <p className="text-xl text-gray-300">
          Welcome to your application
        </p>
      </div>
    </main>
  );
}
