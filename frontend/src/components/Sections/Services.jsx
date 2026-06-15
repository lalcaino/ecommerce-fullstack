import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

// Components
import ClientSlider from "../Elements/ClientSlider";
import FullButton from "../Buttons/FullButton";

// Icons
import {
  FaTruck,
  FaRoute,
  FaBoxes,
  FaClipboardList
} from "react-icons/fa";

// Assets
import images from "../../config/images";

export default function Services() {
  const navigate = useNavigate();

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Wrapper id="services">
      <div className="lightBg" style={{ padding: "50px 0" }}>
      </div>

      <div className="whiteBg" style={{ padding: "60px 0" }}>
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Nuestros Servicios</h1>

            <p className="font13">
              Soluciones logísticas inteligentes diseñadas para optimizar
              entregas, reducir costos y mejorar la eficiencia operativa de tu pyme.
            </p>
          </HeaderInfo>

          <ServiceBoxRow className="flex">
            <ServiceBoxWrapper>
              <ServiceCard>
                <IconWrapper>
                  <FaRoute size={42} />
                </IconWrapper>

                <h3 className="font20 extraBold">
                  Rutas Inteligentes
                </h3>

                <p className="font13">
                  Optimizamos automáticamente las rutas de entrega para reducir
                  tiempos de traslado y costos operativos.
                </p>
              </ServiceCard>
            </ServiceBoxWrapper>

            <ServiceBoxWrapper>
              <ServiceCard>
                <IconWrapper>
                  <FaTruck size={42} />
                </IconWrapper>

                <h3 className="font20 extraBold">
                  Seguimiento en Tiempo Real
                </h3>

                <p className="font13">
                  Monitorea vehículos, pedidos y estados de entrega desde una
                  plataforma centralizada.
                </p>
              </ServiceCard>
            </ServiceBoxWrapper>

            <ServiceBoxWrapper>
              <ServiceCard>
                <IconWrapper>
                  <FaBoxes size={42} />
                </IconWrapper>

                <h3 className="font20 extraBold">
                  Gestión de Inventario
                </h3>

                <p className="font13">
                  Controla stock, movimientos y disponibilidad de productos
                  de forma eficiente.
                </p>
              </ServiceCard>
            </ServiceBoxWrapper>

            <ServiceBoxWrapper>
              <ServiceCard>
                <IconWrapper>
                  <FaClipboardList size={42} />
                </IconWrapper>

                <h3 className="font20 extraBold">
                  Automatización de Pedidos
                </h3>

                <p className="font13">
                  Automatiza órdenes y procesos logísticos para mejorar la
                  productividad de tu empresa.
                </p>
              </ServiceCard>
            </ServiceBoxWrapper>
          </ServiceBoxRow>
        </div>

        <div className="lightBg">
          <div className="container">
            <Advertising className="flexSpaceCenter">
              <AddLeft>
                <h4 className="font15 semiBold">
                  Tecnología logística moderna
                </h4>

                <h2 className="font40 extraBold">
                  Transformamos la logística para pymes
                </h2>

                <p className="font12">
                  SmartLogix ayuda a empresas a optimizar sus entregas mediante
                  rutas inteligentes, monitoreo en tiempo real y automatización
                  de procesos logísticos.
                </p>

                <ButtonsRow
                  className="flexNullCenter"
                  style={{ margin: "30px 0" }}
                >
                  <div style={{ width: "190px" }}>
                    <FullButton
                      title="Comenzar"
                      action={() => navigate("/registro")}
                    />
                  </div>

                  <div
                    style={{
                      width: "190px",
                      marginLeft: "15px"
                    }}
                  >
                    <FullButton
                      title="Contactar"
                      action={scrollToContact}
                      border
                    />
                  </div>
                </ButtonsRow>
              </AddLeft>

              <AddRight>
                <AddRightInner>
                  <div className="flexNullCenter">
                    <AddImgWrapp1 className="flexCenter">
                      <img src={images.add[0]} alt="logistics" />
                    </AddImgWrapp1>

                    <AddImgWrapp2>
                      <img src={images.add[1]} alt="transport" />
                    </AddImgWrapp2>
                  </div>

                  <div className="flexNullCenter">
                    <AddImgWrapp3>
                      <img src={images.add[2]} alt="warehouse" />
                    </AddImgWrapp3>

                    <AddImgWrapp4>
                      <img src={images.add[3]} alt="delivery" />
                    </AddImgWrapp4>
                  </div>
                </AddRightInner>
              </AddRight>
            </Advertising>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  width: 100%;
`;

const ServiceBoxRow = styled.div`
  @media (max-width: 860px) {
    flex-direction: column;
  }
`;

const ServiceBoxWrapper = styled.div`
  width: 22%;
  margin-right: 4%;
  padding: 60px 0;

  &:last-child {
    margin-right: 0;
  }

  @media (max-width: 860px) {
    width: 100%;
    text-align: center;
    padding: 20px 0;
  }
`;

const ServiceCard = styled.div`
  background: #ffffff;
  padding: 40px 30px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-8px);
  }

  h3 {
    margin: 20px 0 15px 0;
    color: #091413;
  }

  p {
    color: #747474;
    line-height: 1.7rem;
  }
`;

const IconWrapper = styled.div`
  width: 75px;
  height: 75px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #408A71;
`;

const HeaderInfo = styled.div`
  @media (max-width: 860px) {
    text-align: center;
  }
`;

const Advertising = styled.div`
  margin: 80px 0;
  padding: 100px 0;
  position: relative;

  @media (max-width: 1160px) {
    padding: 100px 0 40px 0;
  }

  @media (max-width: 860px) {
    flex-direction: column;
    padding: 0 0 30px 0;
    margin: 80px 0 0px 0;
  }
`;

const ButtonsRow = styled.div`
  @media (max-width: 860px) {
    justify-content: space-between;
  }
`;

const AddLeft = styled.div`
  width: 50%;

  p {
    max-width: 475px;
  }

  @media (max-width: 860px) {
    width: 80%;
    order: 2;
    text-align: center;

    h2 {
      line-height: 3rem;
      margin: 15px 0;
    }

    p {
      margin: 0 auto;
    }
  }
`;

const AddRight = styled.div`
  width: 50%;
  position: absolute;
  top: -70px;
  right: 0;

  @media (max-width: 860px) {
    width: 80%;
    position: relative;
    order: 1;
    top: -40px;
  }
`;

const AddRightInner = styled.div`
  width: 100%;
`;

const AddImgWrapp1 = styled.div`
  width: 48%;
  margin: 0 6% 10px 6%;

  img {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;

const AddImgWrapp2 = styled.div`
  width: 30%;
  margin: 0 5% 10px 5%;

  img {
    width: 100%;
    max-height: 150px;
    object-fit: cover;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;

const AddImgWrapp3 = styled.div`
  width: 20%;
  margin-left: 40%;

  img {
    width: 100%;
    max-height: 120px;
    object-fit: cover;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;

const AddImgWrapp4 = styled.div`
  width: 30%;
  margin: 0 5% auto;

  img {
    width: 100%;
    max-height: 150px;
    object-fit: cover;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;