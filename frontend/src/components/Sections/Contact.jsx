import React from "react";
import styled from "styled-components";

export default function Contact() {
  return (
    <Wrapper id="contact">
      <div className="lightBg">
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Contáctanos</h1>
            <p className="font13">
              ¿Tenés preguntas sobre SmartLogix? Dejanos tus datos y te
              <br />
              contactaremos para mostrarte cómo optimizamos tu logística.
            </p>
          </HeaderInfo>
          <div className="row" style={{ paddingBottom: "30px" }}>
            <div className="col-xs-12 col-sm-12 col-md-8 col-lg-6">
              <Form>
                <label className="font13">Nombre completo:</label>
                <input type="text" id="fname" name="fname" className="font20 extraBold" />
                <label className="font13">Correo electrónico:</label>
                <input type="email" id="email" name="email" className="font20 extraBold" />
                <label className="font13">Empresa:</label>
                <input type="text" id="empresa" name="empresa" className="font20 extraBold" />
                <label className="font13">Mensaje:</label>
                <textarea rows="4" cols="50" type="text" id="message" name="message" className="font20 extraBold" />
              </Form>
              <SumbitWrapper className="flex">
                <ButtonInput type="submit" value="Enviar mensaje" className="pointer animate radius8" style={{ maxWidth: "220px" }} />
              </SumbitWrapper>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  width: 100%;
`;
const HeaderInfo = styled.div`
  padding: 70px 0 30px 0;
  @media (max-width: 860px) {
    text-align: center;
  }
`;
const Form = styled.form`
  padding: 70px 0 30px 0;
  input,
  textarea {
    width: 100%;
    background-color: transparent;
    border: 0px;
    outline: none;
    box-shadow: none;
    border-bottom: 1px solid #707070;
    height: 30px;
    margin-bottom: 30px;
  }
  textarea {
    min-height: 100px;
  }
  @media (max-width: 860px) {
    padding: 30px 0;
  }
`;
const ButtonInput = styled.input`
  border: 1px solid #408A71;
  background-color: #408A71;
  width: 100%;
  padding: 15px;
  outline: none;
  color: #fff;
  :hover {
    background-color: #408A71;
    border: 1px solid #408A71;
    color: #fff;
  }
  @media (max-width: 991px) {
    margin: 0 auto;
  }
`;
const SumbitWrapper = styled.div`
  @media (max-width: 991px) {
    width: 100%;
    margin-bottom: 50px;
  }
`;









