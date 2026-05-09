import React from "react";
import styled from "styled-components";
import { Link } from "react-scroll";
import CloseIcon from "../../assets/svg/CloseIcon";

export default function Sidebar({ sidebarOpen, toggleSidebar }) {
  return (
    <Wrapper className="animate darkBg" sidebarOpen={sidebarOpen}>
      <SidebarHeader className="flexSpaceCenter">
        <div className="flexNullCenter">
          <h1 className="whiteColor font20" style={{ marginLeft: "15px" }}>
            SmartLogix
          </h1>
        </div>
        <CloseBtn onClick={() => toggleSidebar(!sidebarOpen)} className="animate pointer">
          <CloseIcon />
        </CloseBtn>
      </SidebarHeader>

      <UlStyle className="flexNullCenter flexColumn">
        {[
          { to: 'home',     label: 'Inicio'    },
          { to: 'services', label: 'Servicios' },
          { to: 'contact',  label: 'Contacto'  },
        ].map(({ to, label }) => (
          <li key={to} className="semiBold font15 pointer">
            <Link
              onClick={() => toggleSidebar(!sidebarOpen)}
              activeClass="active"
              className="whiteColor"
              style={{ padding: "10px 15px" }}
              to={to} spy smooth offset={-60}
            >
              {label}
            </Link>
          </li>
        ))}
      </UlStyle>

      <UlStyle className="flexSpaceCenter">
        <li className="semiBold font15 pointer">
          <a href="/login" style={{ padding: "10px 30px 10px 0" }} className="whiteColor">
            Iniciar Sesión
          </a>
        </li>
        <li className="semiBold font15 pointer flexCenter">
          <a href="/registro" className="radius8 lightBg" style={{ padding: "10px 15px" }}>
            Comenzar
          </a>
        </li>
      </UlStyle>
    </Wrapper>
  );
}

const Wrapper = styled.nav`
  width: 400px;
  height: 100vh;
  position: fixed;
  top: 0;
  padding: 0 30px;
  right: ${(props) => (props.sidebarOpen ? "0px" : "-400px")};
  z-index: 9999;
  @media (max-width: 400px) { width: 100%; }
`;
const SidebarHeader = styled.div`
  padding: 20px 0;
`;
const CloseBtn = styled.button`
  border: 0px;
  outline: none;
  background-color: transparent;
  padding: 10px;
`;
const UlStyle = styled.ul`
  padding: 40px;
  li { margin: 20px 0; }
`;