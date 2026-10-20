import { industries } from "@/lib/catalog";
import { Landing } from "@/components/sections/Landing";

export default function Home() {
  return <Landing industries={industries} />;
}
