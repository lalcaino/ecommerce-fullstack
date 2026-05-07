import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-scroll";

// Components
import Sidebar from "../Nav/Sidebar";
import Backdrop from "../Elements/Backdrop";

// Assets
import Logo from "../../assets/img/logo.png";
import BurgerIcon from "../../assets/svg/BurgerIcon";

export default function TopNavbar() {
  const [y, setY] = useState(window.scrollY);
  const [sidebarOpen, toggleSidebar] = useState(false);

  useEffect(() => {
    window.addEventListener("scroll", () => setY(window.scrollY));

    return () => {
      window.removeEventListener("scroll", () => setY(window.scrollY));
    };
  }, [y]);

  return (
    <>
      <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && <Backdrop toggleSidebar={toggleSidebar} />}

      <Wrapper
        className="flexCenter animate whiteBg"
        style={y > 100 ? { height: "60px" } : { height: "80px" }}
      >
        <NavInner className="container flexSpaceCenter">
          <Link className="pointer flexNullCenter" to="home" smooth={true} style={{ transition: "all 0.3s ease" }}>
            <img
              src={Logo}
              alt="SmartLogix Logo"
              style={{
                width: y > 100 ? "120px" : "180px",
                height: y > 100 ? "120px" : "180px",
                objectFit: "contain",
                transition: "all 0.3s ease" 
              }}
            />

            <h1
              style={{
                marginLeft: y > 100 ? "-40px" : "-55px",
                color: "#408A71",
                fontSize: y > 100 ? "16px" : "20px",  // ← achica con el scroll
                transition: "all 0.3s ease"
              }}
              className="extraBold"  // ← quita "font20" para que no lo sobreescriba
            >
              SmartLogix
            </h1>
          </Link>

          <BurderWrapper
            className="pointer"
            onClick={() => toggleSidebar(!sidebarOpen)}
          >
            <BurgerIcon />
          </BurderWrapper>

          <UlWrapper className="flexNullCenter">
            <li className="semiBold font15 pointer">
              <Link
                activeClass="active"
                style={{ padding: "10px 15px" }}
                to="home"
                spy={true}
                smooth={true}
                offset={-80}
              >
                Inicio
              </Link>
            </li>

            <li className="semiBold font15 pointer">
              <Link
                activeClass="active"
                style={{ padding: "10px 15px" }}
                to="services"
                spy={true}
                smooth={true}
                offset={-80}
              >
                Servicios
              </Link>
            </li>

            <li className="semiBold font15 pointer">
              <Link
                activeClass="active"
                style={{ padding: "10px 15px" }}
                to="projects"
                spy={true}
                smooth={true}
                offset={-80}
              >
                Proyectos
              </Link>
            </li>

            <li className="semiBold font15 pointer">
              <Link
                activeClass="active"
                style={{ padding: "10px 15px" }}
                to="blog"
                spy={true}
                smooth={true}
                offset={-80}
              >
                Blog
              </Link>
            </li>

            <li className="semiBold font15 pointer">
              <Link
                activeClass="active"
                style={{ padding: "10px 15px" }}
                to="pricing"
                spy={true}
                smooth={true}
                offset={-80}
              >
                Planes
              </Link>
            </li>

            <li className="semiBold font15 pointer">
              <Link
                activeClass="active"
                style={{ padding: "10px 15px" }}
                to="contact"
                spy={true}
                smooth={true}
                offset={-80}
              >
                Contacto
              </Link>
            </li>
          </UlWrapper>

          <UlWrapperRight className="flexNullCenter">
            <li className="semiBold font15 pointer">
              <a href="/" style={{ padding: "10px 30px 10px 0" }}>
                Iniciar Sesión
              </a>
            </li>

            <li className="semiBold font15 pointer flexCenter">
              <a
                href="/"
                className="radius8"
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#408A71",
                  color: "white"
                }}
              >
                Comenzar
              </a>
            </li>
          </UlWrapperRight>
        </NavInner>
      </Wrapper>
    </>
  );
}

const Wrapper = styled.nav`
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
`;

const NavInner = styled.div`
  position: relative;
  height: 100%;
`;

const BurderWrapper = styled.button`
  outline: none;
  border: 0px;
  background-color: transparent;
  height: 100%;
  padding: 0 15px;
  display: none;

  @media (max-width: 760px) {
    display: block;
  }
`;

const UlWrapper = styled.ul`
  display: flex;

  @media (max-width: 760px) {
    display: none;
  }
`;

const UlWrapperRight = styled.ul`
  @media (max-width: 760px) {
    display: none;
  }
`;