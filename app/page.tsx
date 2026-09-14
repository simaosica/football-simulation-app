// app/page.tsx
'use client';
import { Suspense } from "react";
import HomeContent from "./homeContent";

export default function Page() {
  return (
    <Suspense>
      <HomeContent/>
    </Suspense>
  );
}