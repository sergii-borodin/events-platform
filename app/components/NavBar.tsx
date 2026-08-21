import Link from "next/link";
import Image from "next/image";
import NavMenu from "./NavMenu";

const NavBar = () => {
  return (
    <header>
      <nav>
        <Link href={"/"} className="logo">
          <Image
            src={"/icons/logo-nav.png"}
            alt="UA Padel Denmark"
            width={40}
            height={48}
            priority
          />
          <p>PadelHub</p>
        </Link>
        <NavMenu />
      </nav>
    </header>
  );
};

export default NavBar;
