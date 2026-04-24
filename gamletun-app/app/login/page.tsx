import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 flex flex-col px-7 pt-5 pb-5 max-w-md w-full mx-auto">
        {/* Logo card */}
        <div
          className="self-center mt-2 w-[300px] max-w-full h-[180px] rounded-[20px] border border-line p-3.5 flex items-center justify-center"
          style={{
            background:
              'radial-gradient(ellipse at 60% 85%, rgba(28,27,24,0.08) 0%, transparent 60%), #fffdf8',
          }}
        >
          <div className="relative w-full h-full">
            <Image
              src="/logo.png"
              alt="Gamletun Gaard"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="font-serif text-[32px] font-medium text-ink mt-7 mb-2 tracking-tight2 text-center leading-[1.05]">
          Velkommen tilbake.
        </h1>
        <p className="text-ink2 text-[15px] text-center leading-[1.5] m-0">
          Logg inn for å se utstyr, ordrer og vedlikeholdslogg.
        </p>

        <LoginForm error={error} />
      </div>
    </div>
  );
}
