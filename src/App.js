import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  Container,
  Menu,
  Segment,
  Form,
  Button,
  Message,
  Grid,
  Header,
  Icon,
  Input,
  Pagination,
  Dimmer,
  Dropdown,
  Loader,
  Label,
  Card,
  Image,
  List,
  Divider,
  Table,
  Select,
  Transition,
  Modal,
  Statistic,
} from "semantic-ui-react";
import axios from "axios";
import InputMask from "react-input-mask";
import { jwtDecode } from "jwt-decode";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { motion } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { notifySuccess, notifyError, notifyInfo } from "../src/components/utils/Util.js";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";


// Importando imagens para os cards de serviços
import cardioImg from "../src/assets/images/cards/cardiologista.png";
import clinicoImg from "../src/assets/images/cards/ClinicoGeral.jpg";
import pediaImg from "../src/assets/images/cards/Pediatria.jpeg";
import dermoImg from "../src/assets/images/cards/Dermatologia.jpg";
import ginecoImg from "../src/assets/images/cards/Ginecologia.jpg";
import LogoMedPlus from "../src/assets/images/logo/ClinicaMED002.png";
import equipeImg from "../src/assets/images/cards/EquipeMedica.jpeg";
import atendimentoImg from "../src/assets/images/cards/CentraldeAtendimento.jpg";


// Importando o componente de botão flutuante do WhatsApp
import WhatsAppFloatingButton from "../src/components/WhatsAppFloatingButton.jsx";


// --- Contexto de Autenticação ---
const AuthContext = createContext(null);


// Hook para acessar o contexto
export const useAuth = () => useContext(AuthContext);


// --- Provedor ---
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("medplus_token"));
  const [loading, setLoading] = useState(true);


  // Axios com interceptor
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: "http://localhost:8080",
    });

    instance.interceptors.request.use(
      (config) => {
        const tokenFromStorage = localStorage.getItem("medplus_token");
        if (tokenFromStorage) {
          config.headers.Authorization = `Bearer ${tokenFromStorage}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, []);


  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem("medplus_token");
    setToken(null);
    setUser(null);
    toast.info("Sessão encerrada.");
  }, []);


  // Carrega usuário a partir do token JWT
  const loadUserFromToken = useCallback(
    (userToken) => {
      if (!userToken) {
        setUser(null);
        return;
      }

      try {
        const decoded = jwtDecode(userToken);

        if (decoded.exp * 1000 < Date.now()) {
          throw new Error("Token expirado.");
        }

        if (decoded.sub && decoded.roles) {
          setUser({
            email: decoded.sub,
            roles: decoded.roles || [],
            id: decoded.userId,
          });
        } else {
          throw new Error("Token inválido.");
        }
      } catch (error) {
        console.error("Token inválido ou expirado:", error);
        toast.warn("Sessão expirada. Faça login novamente.");
        logout();
      }
    },
    [logout]
  );

  useEffect(() => {
    try {
      if (token) {
        loadUserFromToken(token);
      }
    } catch (err) {
      console.error("Erro ao processar token inicial:", err);
    } finally {
      setLoading(false);
    }
  }, [token, loadUserFromToken]);


  // Login
  const login = async (email, senha) => {
    try {
      const response = await api.post("/auth/login", { email, senha });
      const { token: newToken } = response.data;

      localStorage.setItem("medplus_token", newToken);
      setToken(newToken);
      loadUserFromToken(newToken);
      toast.success("Login realizado com sucesso!");
      return { token: newToken };
    } catch (error) {
      logout();
      console.error("Erro no login:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Erro ao realizar login.");
      throw error;
    }
  };
  

  // Registro
  const registerPaciente = async (pacienteData) => {
    const response = await api.post("/auth/registrar/paciente", pacienteData);
    toast.success("Cadastro realizado com sucesso!");
    return response.data;
  };

  if (loading) {
    return (
      <Dimmer active inverted>
        <Loader>Carregando Aplicação...</Loader>
      </Dimmer>
    );
  }

  
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        registerPaciente,
        api,
        isAuthenticated: !!user,
        isAdmin: user?.roles.includes("ADMIN"),
        isPaciente: user?.roles.includes("PACIENTE"),
        isMedico: user?.roles.includes("MEDICO"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// --- Componente de Rota Privada ---
export const PrivateRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Dimmer active inverted>
        <Loader>Verificando acesso...</Loader>
      </Dimmer>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.some((role) => user?.roles.includes(role))) {
    return <Navigate to="/nao-autorizado" replace />;
  }

  return children;
};


// --- Componentes de UI ---
// Navbar com links dinâmicos e tema escuro
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getDashboardLink = () => {
    if (user?.roles?.includes("ROLE_ADMIN")) return "/admin/dashboard";
    if (user?.roles?.includes("ROLE_MEDICO")) return "/medico/dashboard";
    if (user?.roles?.includes("ROLE_PACIENTE")) return "/paciente/dashboard";
    return "/";
  };

  const showDashboardLink =
    Array.isArray(user?.roles) &&
    user.roles.some((role) =>
      ["ROLE_ADMIN", "ROLE_MEDICO", "ROLE_PACIENTE"].includes(role)
    );

  const userName = user?.name || user?.email;

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    // Simulação de carregamento de mensagens
    setTimeout(() => {
      setUnreadMessages(3); // substituir por chamada à API futuramente
    }, 1000);
  }, []);

  const userAvatar = (
    <Image
      avatar
      loading="lazy"
      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
        userName || "Med User"
      )}&background=2185d0&color=fff`}
      alt="Avatar"
      style={{ marginRight: "0.7em" }}
    />
  );

  return (
    <Menu
      className={darkMode ? "navbar-dark" : "navbar-light"}
      fixed="top"
      borderless
    >
      <Container>
        <Menu.Item as={Link} to="/" header>
          <Image
            src={LogoMedPlus}
            alt="Clínica MedPlus"
            style={{ width: "200px", height: "auto", paddingRight: "0px" }}
          />
        </Menu.Item>

        {!isAuthenticated && (
          <>
            <Menu.Item as={Link} to="/" className="menu-item-large">
              Home
            </Menu.Item>

            <Menu.Item as={Link} to="/sobre" className="menu-item-large">
              Sobre
            </Menu.Item>

            <Menu.Item as={Link} to="/servicos" className="menu-item-large">
              Serviços
            </Menu.Item>

            <Menu.Item as={Link} to="/contatos" className="menu-item-large">
              Contato
            </Menu.Item>
          </>
        )}

        {isAuthenticated && showDashboardLink && (
          <Menu.Item as={Link} to={getDashboardLink()}>
            <Icon name="dashboard" /> 
            <span style={{ fontWeight: 'bold' }}> Meu Painel </span>
          </Menu.Item>
        )}

        {isAuthenticated && user?.roles?.includes("ROLE_MEDICO") && (
          <Menu.Item as={Link} to="/medico/pacientes">
            <Icon name="stethoscope" /> 
            <span style={{ fontWeight: 'bold' }}> Meus Pacientes </span>
          </Menu.Item>
        )}

        <Menu.Menu position="right">
          <Menu.Item
            onClick={() => setDarkMode(!darkMode)}
            title="Alternar tema"
            className="menu-item-large"
          >
            <Icon name={darkMode ? "sun" : "moon"} />
          </Menu.Item>

          {isAuthenticated ? (
            <Dropdown
              item
              pointing
              trigger={
                <>
                  {userAvatar}
                  {userName}
                </>
              }
            >
              <Dropdown.Menu>
                <Dropdown.Header icon="user" content="Perfil" />
                <Dropdown.Item
                  as={Link}
                  to="/perfil"
                  icon="user circle"
                  text="Meu Perfil"
                />

                {user?.roles?.includes("ROLE_PACIENTE") && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Header
                      icon="calendar check"
                      content="Consultas"
                    />
                    <Dropdown.Item
                      as={Link}
                      to="/agendamento"
                      icon="calendar plus"
                      text="Agendar Consulta"
                    />
                    <Dropdown.Item
                      as={Link}
                      to="/consultas"
                      icon="history"
                      text="Histórico de Consultas"
                    />
                  </>
                )}

                {user?.roles?.includes("ROLE_MEDICO") && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Header icon="heartbeat" content="Médico" />
                    <Dropdown.Item
                      as={Link}
                      to="/medico/pacientes"
                      icon="address book"
                      text="Lista de Pacientes"
                    />
                    <Dropdown.Item
                      as={Link}
                      to="/medico/consultas"
                      icon="calendar check"
                      text="Minhas Consultas"
                    />
                    <Dropdown.Item
                      as={Link}
                      to="/medico/disponibilidade"
                      icon="clock outline"
                      text="Minha Disponibilidade"
                    />
                  </>
                )}

                {user?.roles?.includes("ROLE_ADMIN") && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Header
                      icon="shield alternate"
                      content="Administrador"
                    />
                    <Dropdown.Item
                      as={Link}
                      to="/admin/gerenciar-usuarios"
                      icon="users"
                      text="Usuários"
                    />
                    
                    <Dropdown.Item
                      as={Link}
                      to="/admin/gerenciar-consultas"
                      icon="calendar"
                      text="Consultas"
                    />
                    
                    <Dropdown.Item
                      as={Link}
                      to="/admin/gerenciar-especialidades"  
                      icon="doctor"  
                      text="Especialidades"  
                    />
                    
                    <Dropdown.Item
                      as={Link}
                      to="/admin/gerenciar-relatorios"
                      icon="file alternate"
                      text="Relatórios"
                    />
                  </>
                )}

                <Dropdown.Divider />
                <Dropdown.Header icon="cog" content="Conta" />
                <Dropdown.Item as={Link} to="/mensagens" icon="comments">
                  Mensagens
                  {unreadMessages > 0 && (
                    <Label color="red" floating circular size="mini">
                      {unreadMessages}
                    </Label>
                  )}
                </Dropdown.Item>
                <Dropdown.Item
                  as={Link}
                  to="/configuracoes"
                  icon="settings"
                  text="Configurações"
                />
                <Dropdown.Item
                  as={Link}
                  to="/alterar-senha"
                  icon="lock"
                  text="Alterar Senha"
                />

                <Dropdown.Divider />
                <Dropdown.Item
                  icon="sign out"
                  text="Sair"
                  onClick={handleLogout}
                />
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <>
              <Menu.Item as={Link} to="/login" className="menu-item-large">
                <Icon name="sign in" /> Entrar
              </Menu.Item>
              <Menu.Item as={Link} to="/registrar" className="menu-item-large">
                <Icon name="user plus" /> Registrar
              </Menu.Item>
            </>
          )}
        </Menu.Menu>
      </Container>
    </Menu>
  );
};

// --- MAIN: Layout Principal ---
const MainLayout = ({ children }) => {
  return (
    <div
      className="layout-root"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Navbar fixa no topo */}
      <Navbar />

      <ToastContainer position="top-right" autoClose={5000} />

      {/* Conteúdo principal que cresce conforme necessário */}
      <Container style={{ marginTop: "8em", marginBottom: "2.5em", flex: 1 }}>
        {children}
      </Container>

      {/* Rodapé responsivo (não sobrepõe conteúdo) */}
      <Footer />

      {/* Botão flutuante do WhatsApp */}
      <WhatsAppFloatingButton />
    </div>
  );
};

// --- FOOTER ---
const Footer = () => (
  <Segment
    inverted
    vertical
    as="footer"
    style={{ padding: "4em 0 2em", background: "#1c4071" }}
  >
    <Container>
      <Grid divided inverted stackable>
        <Grid.Row>
          {/* Sobre */}
          <Grid.Column width={2} className="footer-column">
            <Header inverted as="h3" content="Sobre" />
            <List link inverted>
              <List.Item as={Link} to="/sobre">
                Quem Somos
              </List.Item>
              <List.Item as={Link} to="/team">
                Equipe
              </List.Item>
              <List.Item as={Link} to="/contact">
                Contato
              </List.Item>
            </List>
          </Grid.Column>

          {/* Suporte */}
          <Grid.Column width={2} className="footer-column">
            <Header inverted as="h3" content="Suporte" />
            <List link inverted>
              <List.Item as={Link} to="/help">
                Ajuda
              </List.Item>
              <List.Item as={Link} to="/faq">
                FAQ
              </List.Item>
              <List.Item as={Link} to="/terms">
                Termos
              </List.Item>
            </List>
          </Grid.Column>

          {/* Redes Sociais */}
          <Grid.Column width={5} className="footer-column">
            <Header inverted as="h3" content="Redes Sociais" />
            <List horizontal>
              {[
                {
                  href: "https://facebook.com",
                  name: "facebook",
                  color: "grey",
                },
                {
                  href: "https://linkedin.com",
                  name: "linkedin",
                  color: "grey",
                },
                {
                  href: "https://instagram.com",
                  name: "instagram",
                  color: "grey",
                },
                { href: "https://x.com", name: "x", color: "grey" },
                { href: "https://youtube.com", name: "youtube", color: "grey" },
              ].map(({ href, name, color }) => (
                <List.Item
                  key={name}
                  as="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name={name} size="big" color={color} link />
                </List.Item>
              ))}
            </List>
          </Grid.Column>

          {/* Newsletter */}
          <Grid.Column width={7} className="footer-column">
            <Header inverted as="h3" content="Newsletter" />
            <p>Receba as novidades da nossa Clínica por E‑mail.</p>
            <Input
              fluid
              inverted
              placeholder="Seu e‑mail"
              action={{
                color: "blue",
                labelPosition: "left",
                icon: "mail",
                content: "INSCREVA-SE!",
              }}
              style={{ maxWidth: "100%" }}
            />
          </Grid.Column>
        </Grid.Row>
      </Grid>

      <Divider
        inverted
        section
        style={{ borderColor: "rgba(255,255,255,0.2)" }}
      />

      <Container textAlign="center">
        <p
          style={{ margin: 0, fontSize: "1em", color: "rgba(255,255,255,0.8)" }}
        >
          &copy; {new Date().getFullYear()} MedPlus. Todos os direitos
          reservados.
        </p>
      </Container>
    </Container>
  </Segment>
);

// ######################################################################
// ## INÍCIO DAS PÁGINAS GERADAS/ATUALIZADAS
// ######################################################################

// --- PAGINA HOME ---
const HomePage = () => {
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  const images = [
    { src: cardioImg, alt: "Cardiologista" },
    { src: clinicoImg, alt: "Clínico Geral" },
    { src: pediaImg, alt: "Pediatria" },
    { src: dermoImg, alt: "Dermatologia" },
    { src: ginecoImg, alt: "Ginecologia" },
  ];

  return (
    <Segment
      vertical
      style={{
        padding: "5em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Grid container stackable verticalAlign="middle">
        <Grid.Row columns={2}>
          <Grid.Column
            width={7}
            textAlign="center"
            style={{ padding: "2em 1em" }}
          >
            <div>
              <p
                style={{
                  fontSize: "2.2em",
                  fontWeight: "800",
                  margin: "0",
                  color: "#333",
                  letterSpacing: "0.5px",
                }}
              >
                Bem-vindo à Clínica
              </p>

              <Header
                as="h1"
                style={{
                  fontSize: "5em",
                  fontWeight: "900",
                  margin: "0em 0 0.2em",
                  color: "red",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                Med<span style={{ color: "#1c4071" }}>PLUS</span>
              </Header>

              <p
                style={{
                  fontSize: "1.2em",
                  lineHeight: "1.8",
                  color: "#d33",
                  fontWeight: "500",
                  maxWidth: "700px",
                  margin: "0 auto",
                }}
              >
                Cuidamos da sua saúde com tecnologia e carinho. <br />
                Agende suas consultas online com facilidade e segurança.
              </p>

              <Button
                as={Link}
                to="/sobre"
                primary
                size="large"
                style={{
                  marginTop: "1.5em",
                  padding: "0.8em 2em",
                  fontSize: "1.1em",
                  fontWeight: "bold",
                  borderRadius: "8px",
                }}
              >
                SAIBA MAIS!
                <Icon name="right arrow" style={{ marginLeft: "1em" }} />
              </Button>
            </div>
          </Grid.Column>

          <Grid.Column width={9} textAlign="center">
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <Slider {...sliderSettings}>
                {images.map((img, index) => (
                  <div key={index}>
                    <Image src={img.src} alt={img.alt} bordered rounded />
                  </div>
                ))}
              </Slider>
            </div>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Segment>
  );
};

// --- PÁGINA SOBRE ---
const AboutPage = () => {
  return (
    <Segment
      vertical
      style={{
        padding: "2em 0.5em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Grid
        container
        stackable
        verticalAlign="middle"
        style={{ padding: "0 1.5em", maxWidth: "1200px", margin: "0 auto" }}
      >
        {/* Título */}
        <Grid.Row>
          <Grid.Column width={16} textAlign="center">
            <Header
              as="h2"
              icon
              style={{ fontSize: "1.5rem", color: "#1b1c1d" }}
            >
              <Icon name="info circle" size="huge" color="blue" />
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  marginTop: "1.2rem",
                }}
              >
                Sobre a MedPlus
              </div>
              <Header.Subheader
                style={{
                  marginTop: "1rem",
                  fontSize: "1.4rem",
                  color: "red",
                  maxWidth: "700px",
                  marginInline: "auto",
                }}
              >
                Uma clínica online moderna, dedicada ao seu bem-estar.
              </Header.Subheader>
            </Header>
          </Grid.Column>
        </Grid.Row>

        {/* Conteúdo */}
        <Grid.Row columns={2}>
          {/* Imagem */}
          <Grid.Column width={8}>
            <Image
              src={equipeImg}
              alt="Equipe médica"
              rounded
              bordered
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "320px",
                objectFit: "cover",
                boxShadow: "0 0 10px rgba(0, 0, 0, 0.08)",
              }}
            />
          </Grid.Column>

          {/* Texto */}
          <Grid.Column width={8}>
            <Header
              as="h3"
              style={{ fontSize: "1.6rem", marginTop: "1em", color: "#2185d0" }}
            >
              Quem somos
            </Header>
            <p style={{ fontSize: "1.1rem", lineHeight: "1.8", color: "#333" }}>
              A <strong>MedPlus</strong> nasceu com o propósito de aproximar
              pacientes e profissionais de saúde por meio da tecnologia. Nossa
              missão é oferecer um atendimento humanizado, acessível e eficiente
              — onde quer que você esteja.
            </p>

            <Header
              as="h3"
              style={{
                fontSize: "1.6rem",
                marginTop: "1em",
                color: "#2185d0",
                marginBottom: "0.5em",
              }}
            >
              Nossos valores
            </Header>
            <ul
              style={{
                fontSize: "1.1rem",
                lineHeight: "1.8",
                paddingLeft: "1.2em",
                color: "#333",
              }}
            >
              <li>Compromisso com a saúde e o bem-estar;</li>
              <li>Atendimento com empatia e ética;</li>
              <li>Inovação constante no cuidado com o paciente;</li>
              <li>Segurança e confidencialidade em todos os processos.</li>
            </ul>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Segment>
  );
};

// --- PÁGINA SERVIÇOS ---
const ServicosPage = () => {
  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const servicos = [
    {
      titulo: "Cardiologia",
      descricao:
        "Avaliação e cuidado com a saúde do seu coração com especialistas renomados.",
      icone: "heartbeat",
      cor: "red",
    },
    {
      titulo: "Clínica Geral",
      descricao:
        "Atendimento completo para suas necessidades de saúde no dia a dia.",
      icone: "user md",
      cor: "blue",
    },
    {
      titulo: "Pediatria",
      descricao:
        "Cuidado integral para crianças e adolescentes com carinho e atenção.",
      icone: "child",
      cor: "orange",
    },
    {
      titulo: "Dermatologia",
      descricao:
        "Tratamento de doenças da pele, cabelo e unhas com tecnologia e precisão.",
      icone: "medkit",
      cor: "green",
    },
    {
      titulo: "Ginecologia",
      descricao:
        "Acompanhamento da saúde feminina com profissionais especializados e cuidadosos.",
      icone: "venus",
      cor: "pink",
    },
  ];

  return (
    <Segment
      vertical
      style={{
        padding: "2em 0.5em",
        background: "#fdfdfd",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Grid
        container
        stackable
        style={{ padding: "0 1.5em", maxWidth: "1200px", margin: "0 auto" }}
      >
        <Grid.Row>
          <Grid.Column width={16} textAlign="center">
            <Header
              as="h2"
              icon
              style={{ fontSize: "1.5rem", color: "#1b1c1d" }}
            >
              <Icon name="stethoscope" size="huge" color="blue" />
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  marginTop: "1.2rem",
                }}
              >
                Nossos Serviços
              </div>
              <Header.Subheader
                style={{
                  marginTop: "1rem",
                  fontSize: "1.4rem",
                  color: "red",
                  maxWidth: "750px",
                  marginInline: "auto",
                }}
              >
                Atendimento humanizado com profissionais especializados em
                diversas áreas da saúde.
              </Header.Subheader>
            </Header>
          </Grid.Column>
        </Grid.Row>

        {/* Cards */}
        <Grid.Row columns={3} stackable>
          {servicos.map((servico, index) => (
            <Grid.Column
              key={index}
              textAlign="center"
              style={{ marginBottom: "2.5em" }}
            >
              <motion.div
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ scale: 1.03 }}
                style={{
                  background: "#ffffff",
                  borderRadius: "8px",
                  padding: "2.2em 1.5em",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  transition: "all 0.3s ease",
                  minHeight: "300px",
                }}
              >
                <Icon name={servico.icone} size="huge" color={servico.cor} />
                <Header
                  as="h3"
                  style={{
                    color: "#2185d0",
                    marginTop: "1em",
                    fontSize: "1.5rem",
                  }}
                >
                  {servico.titulo}
                </Header>
                <p
                  style={{
                    fontSize: "1.1rem",
                    color: "#444",
                    lineHeight: "1.6",
                    margin: "1em 0",
                  }}
                >
                  {servico.descricao}
                </p>
                <Button
                  as={Link}
                  to="/paciente/agendar-consulta"
                  primary
                  size="small"
                  style={{ marginTop: "0.5em", borderRadius: "8px" }}
                >
                  AGENDAR
                  <Icon name="calendar plus" style={{ marginLeft: "1em" }} />
                </Button>
              </motion.div>
            </Grid.Column>
          ))}
        </Grid.Row>
      </Grid>
    </Segment>
  );
};

// --- PÁGINA DE CONTATO ---
const ContatoPage = () => {
  const formVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const contatoData = {
    unidade: "Unidade Centro",
    endereco: "Rua Marques Amorim, 586 - Boa Vista, Recife/PE",
    telefone: "(81) 8000-2025",
    email: "contato@medplus.com.br",
    horarios: ["Segunda a Sexta: 08h às 18h", "Sábado: 08h às 13h"],
  };

  return (
    <Segment
      vertical
      style={{
        padding: "2em 0.5em",
        background: "#fdfdfd",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Grid
        container
        stackable
        style={{ padding: "0 1.5em", maxWidth: "1200px", margin: "0 auto" }}
      >
        {/* Título */}
        <Grid.Row>
          <Grid.Column textAlign="center">
            <Header
              as="h2"
              icon
              style={{ fontSize: "1.5rem", color: "#1b1c1d" }}
            >
              <Icon name="mail outline" size="huge" color="blue" />
              <div style={{ fontSize: "2rem", marginTop: "1rem" }}>
                Fale Conosco
              </div>
              <Header.Subheader
                style={{
                  marginTop: "1rem",
                  fontSize: "1.4rem",
                  color: "red",
                  maxWidth: "750px",
                  marginInline: "auto",
                }}
              >
                Tire dúvidas, envie sugestões ou agende um atendimento.
              </Header.Subheader>
            </Header>
          </Grid.Column>
        </Grid.Row>

        {/* Imagem + Formulário */}
        <Grid.Row columns={2}>
          <Grid.Column width={8}>
            <Image
              src={atendimentoImg}
              alt="Central de Atendimento"
              fluid
              rounded
              bordered
              style={{
                maxHeight: "460px",
                objectFit: "cover",
                borderRadius: "8px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              }}
            />
          </Grid.Column>

          <Grid.Column width={8}>
            <motion.div
              variants={formVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{
                background: "#fff",
                padding: "2em",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              }}
            >
              <Form>
                <Form.Input
                  label="Nome"
                  placeholder="Seu nome completo"
                  required
                />
                <Form.Input
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
                <Form.Input
                  label="Assunto"
                  placeholder="Ex: Dúvida sobre agendamento"
                />
                <Form.TextArea
                  label="Mensagem"
                  placeholder="Digite sua mensagem..."
                  required
                  style={{ minHeight: 100 }}
                />
                <Button
                  color="blue"
                  fluid
                  icon
                  labelPosition="right"
                  style={{ marginTop: "1em" }}
                >
                  ENVIAR
                </Button>
              </Form>
            </motion.div>
          </Grid.Column>
        </Grid.Row>

        <Divider
          inverted
          section
          style={{ borderColor: "rgba(255,255,255,0.2)", marginTop: "1.5rem" }}
        />

        {/* Contato + Horários */}
        <Grid.Row columns={2}>
          <Grid.Column width={8}>
            <Header as="h4" color="blue">
              <Icon name="map marker alternate" /> {contatoData.unidade}
            </Header>

            <p>
              <Icon name="location arrow" /> {contatoData.endereco}
            </p>
            <p>
              <Icon name="phone" /> {contatoData.telefone}
            </p>
            <p>
              <Icon name="mail" /> {contatoData.email}
            </p>

            <Header as="h4" color="blue">
              <Icon name="clock outline" /> Funcionamento
            </Header>
            {contatoData.horarios.map((h, i) => (
              <p key={i}>{h}</p>
            ))}
          </Grid.Column>

          <Grid.Column width={8} textAlign="center">
            <Header as="h4" color="blue">
              <Icon name="map" />
              Encontre-nos no Mapa
            </Header>

            <iframe
              title="Localização MedPlus"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3950.3606163720833!2d-34.8941784612287!3d-8.064650342305871!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ab18c57f2d600d%3A0xcfd95e835ff6c162!2sRua%20Marques%20Amorim%2C%20586%20-%20Boa%20Vista%2C%20Recife%20-%20PE%2C%2050070-335!5e0!3m2!1spt-BR!2sbr!4v1750004674562!5m2!1spt-BR!2sbr"
              width="100%"
              height="200"
              style={{
                border: 0,
                borderRadius: "8px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                marginTop: "1em",
              }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Segment>
  );
};

// --- PÁGINA DE LOGIN ---
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { token } = await login(email, password);

      if (token) {
        const decodedToken = jwtDecode(token);
        const roles = decodedToken.roles || [];

        notifySuccess("Login realizado com sucesso!");

        if (roles.includes("ROLE_ADMIN")) {
          navigate("/admin/dashboard", { replace: true });
        } else if (roles.includes("ROLE_MEDICO")) {
          navigate("/medico/dashboard", { replace: true });
        } else if (roles.includes("ROLE_PACIENTE")) {
          navigate("/paciente/dashboard", { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      } else {
        notifyError("Não foi possível obter o token de autenticação.");
      }
    } catch (err) {
      notifyError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Falha no login. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid
      textAlign="center"
      verticalAlign="middle"
      style={{ padding: "5em 0.5em", borderRadius: "8px" }}
    >
      <Grid.Column style={{ maxWidth: 450, width: "100%" }}>
        <Segment raised style={{ padding: "3em 2em" }}>
          <Header as="h2" textAlign="center" style={{ marginBottom: "2em" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Icon
                name="user circle outline"
                size="huge"
                style={{ marginBottom: "0.1em" }}
              />
              <p>
                Entrar no
                <span style={{ fontWeight: "bold", color: "red" }}>
                  {" "}
                  Med<span style={{ color: "#1c4071" }}>Plus</span>
                </span>
              </p>
            </div>
          </Header>

          <Form
            size="large"
            onSubmit={handleSubmit}
            error={!!error}
            loading={loading}
          >
            <Form.Field>
              <Input
                fluid
                icon="mail"
                iconPosition="left"
                placeholder="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Field>

            <Form.Field style={{ position: "relative" }}>
              <Input
                fluid
                icon="lock"
                iconPosition="left"
                placeholder="Senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Icon
                name={showPassword ? "eye slash" : "eye"}
                link
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "1rem",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "#888",
                  zIndex: 10,
                }}
              />
            </Form.Field>

            <Button
              color="blue"
              fluid
              size="large"
              type="submit"
              style={{ marginTop: "1em" }}
              animated
            >
              <Button.Content visible>ENTRAR</Button.Content>
              <Button.Content hidden>
                <Icon name="sign-in" />
              </Button.Content>
            </Button>
          </Form>

          <Message style={{ marginTop: "2em" }}>
            Novo por aqui?{" "}
            <Link to="/registrar">Registre-se como Paciente</Link>
          </Message>
        </Segment>
      </Grid.Column>
    </Grid>
  );
};

// --- PÁGINA DE REGISTRO DE PACIENTE (NOVA) ---
const RegisterPacientePage = () => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    cpf: "",
    dataNascimento: "",
    telefone: "",
    endereco: {
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const { registerPaciente } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEnderecoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      endereco: { ...prev.endereco, [name]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.telefone.replace(/\D/g, ""),
        endereco: {
          ...formData.endereco,
          cep: formData.endereco.cep,
        },
      };

      await registerPaciente(dataToSend);

      notifySuccess("Registro realizado com sucesso! Redirecionando para o login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.validationErrors) {
        const errorMessages = Object.values(errorData.validationErrors).join("\n");
        notifyError(errorMessages);
      } else {
        notifyError(errorData?.message || "Ocorreu um erro no registro.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid centered verticalAlign="middle" style={{ padding: "3em 0.5em" }}>
      <Grid.Column style={{ maxWidth: 1000 }}>
        <Form onSubmit={handleSubmit} loading={loading}>
          <Segment stacked style={{ padding: "3em 2em", borderRadius: "8px" }}>
            <Header as="h3" color="black" textAlign="center" style={{ marginBottom: "2em" }}>
              <Icon name="user plus" /> Crie sua Conta de Paciente
            </Header>

            <Grid stackable columns={2}>
              <Grid.Column>
                <Header as="h4" dividing>Informações Pessoais</Header>
                <Form.Input
                  label="Nome Completo"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
                <Form.Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Form.Input
                  label="Senha"
                  type="password"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                  minLength="6"
                />
                <Form.Field required>
                  <label>CPF</label>
                  <InputMask
                    mask="999.999.999-99"
                    value={formData.cpf}
                    onChange={handleChange}
                    name="cpf"
                  >
                    {(inputProps) => <Form.Input {...inputProps} />}
                  </InputMask>
                </Form.Field>
                <Form.Input
                  label="Data de Nascimento"
                  type="date"
                  name="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  required
                />
                <Form.Field>
                  <label>Telefone</label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={formData.telefone}
                    onChange={handleChange}
                    name="telefone"
                  >
                    {(inputProps) => <Form.Input {...inputProps} />}
                  </InputMask>
                </Form.Field>
              </Grid.Column>

              <Grid.Column>
                <Header as="h4" dividing>Endereço</Header>
                <Form.Input
                  label="Logradouro"
                  name="logradouro"
                  value={formData.endereco.logradouro}
                  onChange={handleEnderecoChange}
                  required
                />
                <Form.Group widths="equal">
                  <Form.Input
                    label="Número"
                    name="numero"
                    value={formData.endereco.numero}
                    onChange={handleEnderecoChange}
                    required
                  />
                </Form.Group>
                <Form.Group widths="equal">
                  <Form.Input
                    label="Complemento"
                    name="complemento"
                    value={formData.endereco.complemento}
                    onChange={handleEnderecoChange}
                  />
                </Form.Group>
                <Form.Input
                  label="Bairro"
                  name="bairro"
                  value={formData.endereco.bairro}
                  onChange={handleEnderecoChange}
                  required
                />
                <Form.Group widths="equal">
                  <Form.Input
                    label="Cidade"
                    name="cidade"
                    value={formData.endereco.cidade}
                    onChange={handleEnderecoChange}
                    required
                  />
                  <Form.Input
                    label="UF"
                    name="uf"
                    value={formData.endereco.uf}
                    onChange={handleEnderecoChange}
                    required
                    maxLength="2"
                  />
                </Form.Group>
                <Form.Field required>
                  <label>CEP</label>
                  <InputMask
                    mask="99999-999"
                    value={formData.endereco.cep}
                    onChange={handleEnderecoChange}
                    name="cep"
                  >
                    {(inputProps) => <Form.Input {...inputProps} />}
                  </InputMask>
                </Form.Field>
              </Grid.Column>
            </Grid>

            <Button
              color="blue"
              fluid
              size="large"
              type="submit"
              disabled={loading}
              style={{ marginTop: "2em" }}
            >
              {loading ? "Registrando..." : "REGISTRAR"}
            </Button>
          </Segment>
        </Form>

        <Message style={{ marginTop: "2em", textAlign: "center" }}>
          Já tem uma conta? <Link to="/login">Faça Login</Link>
        </Message>
      </Grid.Column>
    </Grid>
  );
};

// --- PÁGINA DE AGENDAMENTO DE CONSULTA (NOVA) ---
const AgendarConsultaPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [formData, setFormData] = useState({ medicoId: "", dataHora: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        // Assumindo que este endpoint retorne uma lista de médicos
        const response = await api.get("/medicos");
        const medicosOptions = response.data.map((medico) => ({
          key: medico.id,
          text: `${medico.nome} - ${medico.especialidade}`,
          value: medico.id,
        }));
        setMedicos(medicosOptions);
      } catch (err) {
        setError("Não foi possível carregar a lista de médicos.");
      }
    };
    fetchMedicos();
  }, [api]);

  const handleChange = (e, { name, value }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!formData.medicoId || !formData.dataHora) {
      setError("Por favor, selecione um médico e uma data/hora.");
      setLoading(false);
      return;
    }

    try {
      // Assumindo um endpoint para agendar
      await api.post("/consultas/agendar", formData);
      setSuccess("Consulta agendada com sucesso! Redirecionando...");
      setTimeout(() => navigate("/paciente/dashboard"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao agendar consulta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header
        as="h2"
        icon="calendar plus outline"
        content="Agendar Nova Consulta"
      />
      <Form
        onSubmit={handleSubmit}
        loading={loading}
        error={!!error}
        success={!!success}
      >
        <Form.Field
          control={Select}
          options={medicos}
          label={{ children: "Médico", htmlFor: "medico-select" }}
          placeholder="Selecione um Médico"
          search
          searchInput={{ id: "medico-select" }}
          name="medicoId"
          onChange={handleChange}
          required
        />
        <Form.Input
          label="Data e Hora"
          type="datetime-local"
          name="dataHora"
          value={formData.dataHora}
          onChange={handleChange}
          required
        />
        <Message error header="Erro" content={error} />
        <Message success header="Sucesso" content={success} />
        <Button type="submit" primary>
          Agendar
        </Button>
        <Button type="button" onClick={() => navigate("/paciente/dashboard")}>
          Voltar
        </Button>
      </Form>
    </Segment>
  );
};


// --- DASHBOARD PACIENTE (ATUALIZADO 22/JUNHO) ---
const PacienteDashboardPage = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);

  const fetchConsultas = useCallback(async () => {
    if (user) {
      try {
        setLoading(true);
        const response = await api.get(`/pacientes/minhas-consultas`);
        setConsultas(response.data);
      } catch (err) {
        notifyError("Não foi possível carregar suas consultas.");
      } finally {
        setLoading(false);
      }
    }
  }, [user, api]);

  useEffect(() => {
    fetchConsultas();
  }, [fetchConsultas]);

  const handleOpenModal = (consulta) => {
    setSelectedConsulta(consulta);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedConsulta(null);
  };

  const handleCancelarConsulta = async () => {
    if (!selectedConsulta) return;
    try {
      await api.patch(`/pacientes/consultas/${selectedConsulta.id}/cancelar?motivo=Cancelamento pelo paciente`);
      notifySuccess("Consulta cancelada com sucesso.");
      handleCloseModal();
      fetchConsultas();
    } catch (err) {
      notifyError("Erro ao cancelar a consulta.");
    }
  };

  const handleDownloadComprovante = (consultaId) => {
    // Exemplo de download de comprovante
    notifyInfo("Comprovante baixado com sucesso.");
    // window.open(`/api/consultas/${consultaId}/comprovante`, "_blank");
  };

  const handleReagendarConsulta = (consultaId) => {
    navigate(`/paciente/reagendar-consulta/${consultaId}`);
  };

  const handleVisualizarDetalhes = (consulta) => {
    notifyInfo(`
      Médico: Dr(a). ${consulta.medicoNome}
      Especialidade: ${consulta.especialidadeMedico}
      Data: ${new Date(consulta.dataHora).toLocaleString("pt-BR")}
      Status: ${consulta.status}
      Observações: ${consulta.observacoes || "Nenhuma"}
    `);
  };

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h1">Dashboard do Paciente</Header>
      <p>Bem-vindo(a), {user?.email}!</p>
      <Divider />
      <Header as="h3">Minhas Consultas</Header>

      {loading ? (
        <Loader active inline="centered">
          Carregando consultas...
        </Loader>
      ) : consultas.length === 0 ? (
        <Message info>
          <Message.Header>Nenhuma consulta encontrada</Message.Header>
          <p>Você ainda não tem consultas agendadas.</p>
        </Message>
      ) : (
        <Card.Group itemsPerRow={2} stackable>
          {consultas.map((consulta) => (
            <Card
              key={consulta.id}
              color={consulta.status === "Agendada" ? "blue" : "grey"}
            >
              <Card.Content>
                <Card.Header>
                  Consulta com Dr(a). {consulta.medicoNome}
                </Card.Header>
                <Card.Meta>{consulta.especialidadeMedico}</Card.Meta>
                <Card.Description>
                  <List>
                    <List.Item
                      icon="calendar alternate outline"
                      content={`Data: ${new Date(
                        consulta.dataHora
                      ).toLocaleString("pt-BR")}`}
                    />
                    <List.Item
                      icon="info circle"
                      content={`Status: ${consulta.status}`}
                    />
                  </List>
                </Card.Description>
              </Card.Content>
              <Card.Content extra>
                <Button
                  size="tiny"
                  basic
                  onClick={() => handleVisualizarDetalhes(consulta)}
                >
                  Detalhes
                </Button>
                <Button
                  size="tiny"
                  basic
                  color="green"
                  onClick={() => handleDownloadComprovante(consulta.id)}
                >
                  Comprovante
                </Button>
                <Button
                  size="tiny"
                  basic
                  color="orange"
                  onClick={() => handleReagendarConsulta(consulta.id)}
                  disabled={consulta.status !== "Agendada"}
                >
                  Reagendar
                </Button>
                <Button
                  size="tiny"
                  basic
                  color="red"
                  onClick={() => handleOpenModal(consulta)}
                  disabled={consulta.status !== "Agendada"}
                >
                  Cancelar
                </Button>
              </Card.Content>
            </Card>
          ))}
        </Card.Group>
      )}

      <Divider />
      <Button
        as={Link}
        to="/paciente/agendar-consulta"
        primary
        icon
        labelPosition="right"
      >
        Agendar Consulta
        <Icon name="calendar plus outline" />
      </Button>

      {/* Modal de confirmação de cancelamento */}
      <Modal open={modalOpen} onClose={handleCloseModal} size="tiny">
        <Header icon="trash" content="Cancelar Consulta" />
        <Modal.Content>
          <p>Você tem certeza que deseja cancelar esta consulta?</p>
        </Modal.Content>
        <Modal.Actions>
          <Button color="red" onClick={handleCancelarConsulta}>
            <Icon name="checkmark" /> Sim, cancelar
          </Button>
          <Button onClick={handleCloseModal}>
            <Icon name="remove" /> Não
          </Button>
        </Modal.Actions>
      </Modal>
    </Segment>
  );
};


// --- PÁGINA DE REAGENDAMENTO DE CONSULTA (NOVA 22/JUNHO) ---
const ReagendarConsultaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [consulta, setConsulta] = useState(null);
  const [novaDataHora, setNovaDataHora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsulta = async () => {
      try {
        const response = await api.get(`/consultas/${id}`);
        setConsulta(response.data);
        setObservacoes(response.data.observacoes || "");
      } catch (err) {
        notifyError("Erro ao carregar consulta.");
      } finally {
        setLoading(false);
      }
    };
    fetchConsulta();
  }, [id, api]);

  const handleSubmit = async () => {
    try {
      await api.patch(`/consultas/${id}/reagendar`, {
        novaDataHora,
        observacoes,
      });
      notifySuccess("Consulta reagendada com sucesso.");
      navigate("/paciente/dashboard");
    } catch (err) {
      notifyError("Erro ao reagendar consulta.");
    }
  };

  if (loading || !consulta) {
    return <p>Carregando...</p>;
  }

  return (
    <Segment style={{ padding: "2em" }}>
      <Header as="h2">Reagendar Consulta</Header>
      <Form onSubmit={handleSubmit}>
        <Form.Input
          label="Nova Data e Hora"
          type="datetime-local"
          value={novaDataHora}
          onChange={(e) => setNovaDataHora(e.target.value)}
          required
        />
        <Form.TextArea
          label="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
        <Button primary type="submit">
          Confirmar Reagendamento
        </Button>
      </Form>
    </Segment>
  );
};


// --- AGENDA DO MÉDICO (NOVA) ---
const MedicoAgendaPage = () => {
  const { api } = useAuth(); // CORREÇÃO APLICADA AQUI
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        setLoading(true);
        // Assumindo endpoint para agenda do médico.
        // A API identifica o médico pelo token, por isso a variável 'user' não era necessária.
        const response = await api.get("/medicos/minha-agenda");
        setAgenda(response.data);
      } catch (err) {
        setError("Não foi possível carregar sua agenda.");
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, [api]);

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2">Minha Agenda</Header>
      {loading && (
        <Loader active inline="centered">
          Carregando agenda...
        </Loader>
      )}
      {error && <Message error content={error} />}
      {!loading && agenda.length === 0 && <p>Nenhuma consulta agendada.</p>}
      {!loading && agenda.length > 0 && (
        <Table celled>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Data/Hora</Table.HeaderCell>
              <Table.HeaderCell>Paciente</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Ações</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {agenda.map((consulta) => (
              <Table.Row key={consulta.id}>
                <Table.Cell>
                  {new Date(consulta.dataHora).toLocaleString("pt-BR")}
                </Table.Cell>
                <Table.Cell>{consulta.pacienteNome}</Table.Cell>
                <Table.Cell>{consulta.status}</Table.Cell>
                <Table.Cell>
                  <Button size="mini" primary>
                    Ver Detalhes
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Segment>
  );
};


// --- DASHBOARD MÉDICO (NOVA) ---
// Helper de formatação de data movido para fora do componente para otimização
const formatarData = (data) => {
  if (!data) return "Data inválida";
  const date = new Date(data);
  return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MedicoDashboardPage = () => {
  const { user, api } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isBackgroundRefresh = false) => {
    if (!user) return;

    try {
      if (!isBackgroundRefresh) setLoadingInitial(true);
      else setIsRefreshing(true);

      const response = await api.get("/medicos/dashboard");
      setDashboardData(response.data);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
      toast.error("Não foi possível carregar os dados do dashboard.");
    } finally {
      setLoadingInitial(false);
      setIsRefreshing(false);
    }
  }, [user, api]);

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => fetchDashboardData(true), 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return (
    <Segment
      vertical
      style={{
        padding: "2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Header as="h1" style={{ margin: 0 }}>Dashboard do Médico</Header>
        <Button
          onClick={() => fetchDashboardData(true)}
          loading={isRefreshing}
          primary
          icon
          labelPosition="left"
          size="small"
          aria-label="Atualizar dados do dashboard"
        >
          <Icon name="refresh" />
          Atualizar
        </Button>
      </div>

      <p style={{ marginTop: '0.5em' }}>
        Bem-vindo(a), Dr(a). {user?.email || "usuário"}!
      </p>
      <Divider />

      {loadingInitial ? (
        <Loader active inline="centered" content="Carregando informações..." />
      ) : !dashboardData ? (
        <Message warning content="Não foi possível carregar as informações do dashboard." />
      ) : (
        <Grid columns={2} stackable divided>
          <Grid.Row>
            {/* Coluna esquerda: Resumo */}
            <Grid.Column width={6}>
              <Header as="h3">Resumo de Hoje</Header>
              <Statistic.Group widths="two" size="small">
                <Statistic>
                  <Statistic.Value>
                    <Icon name="calendar check outline" /> {dashboardData.consultasHoje ?? 0}
                  </Statistic.Value>
                  <Statistic.Label>Consultas Hoje</Statistic.Label>
                </Statistic>
                <Statistic>
                  <Statistic.Value>
                    <Icon name="user md" /> {dashboardData.pacientesDoDia ?? 0}
                  </Statistic.Value>
                  <Statistic.Label>Pacientes no Dia</Statistic.Label>
                </Statistic>
              </Statistic.Group>

              <Divider />
              <Button
                as={Link}
                to="/medico/agenda"
                primary
                fluid
                icon
                labelPosition="left"
                aria-label="Ver agenda completa"
              >
                <Icon name="calendar alternate" />
                Ver Agenda Completa
              </Button>
            </Grid.Column>

            {/* Coluna direita: Consultas */}
            <Grid.Column width={10}>
              <Header as="h3">Próximas Consultas</Header>
              {dashboardData.proximasConsultas?.length > 0 ? (
                <List divided relaxed>
                  {dashboardData.proximasConsultas.map((consulta) => (
                    <List.Item key={consulta.id}>
                      <List.Icon name="user circle" size="large" verticalAlign="middle" />
                      <List.Content>
                        <List.Header>{consulta.pacienteNome}</List.Header>
                        <List.Description>
                          {formatarData(consulta.dataHora)} - Status: {consulta.status}
                        </List.Description>
                      </List.Content>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <p>Nenhuma consulta agendada para o futuro próximo.</p>
              )}
            </Grid.Column>
          </Grid.Row>
        </Grid>
      )}
    </Segment>
  );
};


// --- PÁGINA DE PACIENTES DO MÉDICO (NOVA) ---
const MedicoPacientesPage = () => {
  const { api } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        setLoading(true);
        const response = await api.get("/medicos/meus-pacientes"); // Endpoint esperado
        setPacientes(response.data);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar a lista de pacientes.");
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, [api]);

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2">
        <Icon name="users" />
        Meus Pacientes
      </Header>

      {loading && <Loader active inline="centered" content="Carregando pacientes..." />}
      {error && <Message error content={error} />}
      {!loading && pacientes.length === 0 && <p>Você ainda não atendeu nenhum paciente.</p>}

      {!loading && pacientes.length > 0 && (
        <Table celled>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nome</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Telefone</Table.HeaderCell>
              <Table.HeaderCell>Ações</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pacientes.map((paciente) => (
              <Table.Row key={paciente.id}>
                <Table.Cell>{paciente.nome}</Table.Cell>
                <Table.Cell>{paciente.email}</Table.Cell>
                <Table.Cell>{paciente.telefone || "Não informado"}</Table.Cell>
                <Table.Cell>
                  <Button
                    size="mini"
                    as={Link}
                    to={`/medico/pacientes/${paciente.id}`}
                    icon
                    labelPosition="left"
                    primary
                  >
                    <Icon name="eye" />
                    Detalhes
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Segment>
  );
};


//--- PAGINA DO PERFIL ---
// Componente da página de perfil do usuário
const UserProfilePage = () => {
  const { api, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/perfil");
      const data = {
        ...response.data,
        endereco: response.data.endereco || {
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          uf: "",
          cep: "",
        },
      };

      setProfileData(data);
      setFormData(data);

      const baseURL = "http://localhost:8080";
      setAvatarPreview(data.avatarUrl ? `${baseURL}${data.avatarUrl}` : null);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      toast.error("Não foi possível carregar as informações do perfil.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (e, { name, value }) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const cleanCPF = (cpf) => cpf.replace(/\D/g, "");
  const cleanPhone = (tel) => tel.replace(/\D/g, "").replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else if (file) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append("avatar", avatarFile);
        await api.put("/perfil/avatar", avatarData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const payload = {
        ...formData,
        cpf: cleanCPF(formData.cpf || ""),
        telefone: cleanPhone(formData.telefone || ""),
      };

      await api.put("/perfil", payload);

      toast.success("Perfil atualizado com sucesso!");
      setEditMode(false);
      setAvatarFile(null);
      await fetchProfile();
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      const msg = err.response?.data?.message || "Erro ao salvar as alterações.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      await api.delete("/perfil");
      toast.success("Sua conta foi excluída com sucesso. Você será desconectado.");
      setTimeout(() => logout(), 3000);
    } catch (err) {
      console.error("Erro ao excluir conta:", err);
      const msg = err.response?.data?.message || "Não foi possível excluir sua conta.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnterEditMode = () => {
    setFormData(profileData);
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormData(profileData);
    setAvatarFile(null);
    setAvatarPreview(profileData.avatarUrl || null);
  };

  const openConfirmModal = (action) => setConfirmModal({ open: true, action });
  const closeConfirmModal = () => setConfirmModal({ open: false, action: null });
  const onConfirm = () => {
    const { action } = confirmModal;
    closeConfirmModal();
    if (action === "save") handleSaveChanges();
    else if (action === "cancel") handleCancelEdit();
    else if (action === "delete") handleDeleteAccount();
  };

  if (loading)
    return (
      <Segment basic padded="very">
        <Loader active inline="centered" size="large" content="Carregando seu perfil..." />
      </Segment>
    );

  if (!profileData)
    return <Message error header="Erro" content="Não foi possível carregar os dados do perfil." />;

  const formatCPF = (cpf) => cpf?.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  const formatRG = (rg) => rg?.replace(/^(\d{1,2})(\d{3})(\d{3})$/, "$1.$2.$3");
  const formatTelefone = (tel) => tel?.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  };

  const isMedico = profileData.roles?.includes("ROLE_MEDICO");

  return (
    <>
      <Segment vertical padded="very" style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}>
        <Grid stackable columns={2}>
          <Grid.Column width={5}>
            <Segment textAlign="center">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  size="small"
                  circular
                  centered
                  onError={(e) => {
                    e.target.onerror = null;
                    setAvatarPreview(null); // Se imagem falhar, zera o preview para mostrar o ícone
                  }}
                />
              ) : (
                <Icon
                  name="user circle"
                  size="massive"
                  color="grey"
                  style={{ margin: "1em auto", display: "block" }}
                />
              )}

              <Header as="h2" style={{ marginTop: "0.5em" }}>Minha Foto</Header>

              {editMode && (
                <>
                  <Button
                    as="label"
                    htmlFor="avatar-upload"
                    icon="camera"
                    content="Alterar Foto"
                    style={{ marginTop: "1em" }}
                  />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    hidden
                  />
                </>
              )}
            </Segment>
          </Grid.Column>

          <Grid.Column width={11}>
            <Transition visible={!editMode} animation="fade up" duration={500}>
              <Segment>
                <Header as="h1" icon="user circle" content="Meu Perfil" />
                <p>Bem-vindo(a): <strong>{profileData.nome || profileData.email}</strong>!</p>
                <p>Você está logado como: <strong>{isMedico ? "Médico" : "Paciente"}</strong>.</p>
                <p>Seu último acesso foi em: {profileData.ultimoAcesso ? new Date(profileData.ultimoAcesso).toLocaleString("pt-BR") : "Nunca"}</p>
                <p>Data de cadastro: {new Date(profileData.dataCadastro).toLocaleDateString("pt-BR")}</p>

                <Divider horizontal>Dados do Perfil</Divider>
                <p><strong>ID:</strong> {profileData.id}</p>
                <p><strong>Nome:</strong> {profileData.nome}</p>
                <p><strong>CPF:</strong> {profileData.cpf ? formatCPF(profileData.cpf.replace(/\D/g, "")) : "Não informado"}</p>
                <p><strong>RG:</strong> {profileData.rg ? formatRG(profileData.rg.replace(/\D/g, "")) : "Não informado"}</p>
                {isMedico && <p><strong>CRM:</strong> {profileData.crm || "Não informado"}</p>}
                <p><strong>Data de Nascimento:</strong> {profileData.dataNascimento ? new Date(profileData.dataNascimento).toLocaleDateString("pt-BR") : "Não informado"}</p>
                <p><strong>Email:</strong> {profileData.email}</p>
                <p><strong>Telefone:</strong> {profileData.telefone ? formatTelefone(profileData.telefone.replace(/\D/g, "")) : "Não informado"}</p>

                <Divider horizontal>Endereço</Divider>
                <p><strong>Logradouro:</strong> {profileData.endereco?.logradouro || "Não informado"}</p>
                <p><strong>Número:</strong> {profileData.endereco?.numero || "Não informado"}</p>
                <p><strong>Complemento:</strong> {profileData.endereco?.complemento || "Não informado"}</p>
                <p><strong>Bairro:</strong> {profileData.endereco?.bairro || "Não informado"}</p>
                <p><strong>Cidade:</strong> {profileData.endereco?.cidade || "Não informado"}</p>
                <p><strong>UF:</strong> {profileData.endereco?.uf || "Não informado"}</p>
                <p><strong>CEP:</strong> {profileData.endereco?.cep || "Não informado"}</p>

                <Divider />
                <Button color="blue" icon="edit" content="Editar" onClick={handleEnterEditMode} disabled={isSaving} />
                <Button color="red" icon="trash" content="Deletar" onClick={() => openConfirmModal("delete")} disabled={isSaving} />
              </Segment>
            </Transition>

            <Transition visible={editMode} animation="fade up" duration={500}>
              <Segment>
                <Header as="h3">Editar Perfil</Header>
                <Form onSubmit={(e) => { e.preventDefault(); openConfirmModal("save"); }}>
                  <Form.Input label="Nome" name="nome" value={formData.nome || ""} onChange={handleInputChange} required />
                  <Form.Input label="Email" name="email" value={formData.email || ""} disabled />

                  <Form.Field>
                    <label>CPF</label>
                    <InputMask mask="999.999.999-99" value={formData.cpf || ""} onChange={(e) => handleInputChange(e, { name: "cpf", value: e.target.value })}>
                      {(inputProps) => <Form.Input {...inputProps} />}
                    </InputMask>
                  </Form.Field>

                  <Form.Input 
                    label="RG" 
                    name="rg" 
                    value={formData.rg || ""} 
                    onChange={handleInputChange} 
                    maxLength={20} 
                    placeholder="Digite seu RG" 
                  />

                  <Form.Input 
                    label="Data de Nascimento" 
                    name="dataNascimento" 
                    type="date" 
                    value={formData.dataNascimento ? formatDateForInput(formData.dataNascimento) : ""} 
                    onChange={handleInputChange} 
                  />

                  <Form.Field>
                    <label>Telefone</label>
                    <InputMask mask="(99) 99999-9999" value={formData.telefone || ""} onChange={(e) => handleInputChange(e, { name: "telefone", value: e.target.value })}>
                      {(inputProps) => <Form.Input {...inputProps} />}
                    </InputMask>
                  </Form.Field>

                  <Divider horizontal>Endereço</Divider>
                  <Form.Input label="Logradouro" name="endereco.logradouro" value={formData.endereco?.logradouro || ""} onChange={handleInputChange} />
                  <Form.Input label="Número" name="endereco.numero" value={formData.endereco?.numero || ""} onChange={handleInputChange} />
                  <Form.Input label="Complemento" name="endereco.complemento" value={formData.endereco?.complemento || ""} onChange={handleInputChange} />
                  <Form.Input label="Bairro" name="endereco.bairro" value={formData.endereco?.bairro || ""} onChange={handleInputChange} />
                  <Form.Input label="Cidade" name="endereco.cidade" value={formData.endereco?.cidade || ""} onChange={handleInputChange} />
                  <Form.Input label="UF" name="endereco.uf" maxLength="2" value={formData.endereco?.uf || ""} onChange={(e, { value }) => handleInputChange(e, { name: "endereco.uf", value: value.toUpperCase() })} />
                  <Form.Input label="CEP" name="endereco.cep" value={formData.endereco?.cep || ""} onChange={handleInputChange} />

                  <Divider />
                  <Button type="submit" color="green" content="Salvar Alterações" loading={isSaving} disabled={isSaving} />
                  <Button type="button" onClick={() => openConfirmModal("cancel")} content="Cancelar" disabled={isSaving} />
                </Form>
              </Segment>
            </Transition>
          </Grid.Column>
        </Grid>
      </Segment>

      <Modal size="tiny" open={confirmModal.open} onClose={closeConfirmModal}>
        <Header icon="question circle" content="Confirmar Ação" />
        <Modal.Content>
          <p>
            {confirmModal.action === "save" && "Tem certeza que deseja salvar as alterações?"}
            {confirmModal.action === "cancel" && "Deseja cancelar a edição? As alterações não serão salvas."}
            {confirmModal.action === "delete" && "ATENÇÃO: Esta ação é irreversível. Tem certeza que deseja excluir sua conta?"}
          </p>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={closeConfirmModal} content="Não" />
          <Button color={confirmModal.action === "delete" ? "red" : "green"} onClick={onConfirm} content="Sim" />
        </Modal.Actions>
      </Modal>
    </>
  );
};




// --- DASHBOARD DO ADMIN (NOVA) ---
// Registrando os componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboardPage = () => {
  const { user } = useAuth();

  // Estado para armazenar os dados das estatísticas
  const [stats, setStats] = useState({
    usuarios: 0,
    consultas: 0,
    especialidades: 0,
    consultasMensais: [] // Para gráfico de consultas mensais
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Função para buscar as estatísticas da API
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(""); // Limpar erros anteriores
        const response = await axios.get("/api/admin/dashboard");  // Endereço da API que retorna as estatísticas
        setStats(response.data);
      } catch (err) {
        console.error("Erro ao carregar as estatísticas:", err);
        setError("Falha ao carregar as estatísticas.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []); // Executa apenas uma vez quando o componente é montado

  // Dados para o gráfico de consultas mensais
  const chartData = {
    labels: stats.consultasMensais.map((_, index) => `Mês ${index + 1}`), // Meses como rótulos
    datasets: [
      {
        label: "Consultas Mensais",
        data: stats.consultasMensais, // Dados de consultas mensais
        fill: true,
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)",
        tension: 0.3,
      },
    ],
  };

  return (
    <Segment
      vertical
      style={{
        padding: "2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2" style={{ marginBottom: "1em" }}>
        <Icon name="dashboard" style={{ marginRight: "7px" }} />
        Dashboard do Administrador
      </Header>
      <p>Bem-vindo(a), <strong>{user?.email}</strong>!</p>
      <p>
        Aqui você poderá gerenciar usuários, consultas, médicos e relatórios do sistema.
      </p>

      {/* Carregamento ou erro */}
      {loading && (
        <Loader active inline="centered" />
      )}
      {error && (
        <Message error header="Erro" content={error} />
      )}

      {/* Gráfico de Consultas Mensais */}
      {!loading && !error && stats.consultasMensais && (
        <Grid columns={2} doubling stackable>
          <Grid.Row>
            <Grid.Column>
              <Card>
                <Card.Content>
                  <Card.Header>Consultas Mensais</Card.Header>
                  <Card.Meta>{stats.consultas}</Card.Meta>
                  <Card.Description>Total de consultas realizadas.</Card.Description>
                </Card.Content>
                <Card.Content extra>
                  <Line data={chartData} />
                </Card.Content>
              </Card>
            </Grid.Column>

            {/* Estatísticas de Usuários e Especialidades */}
            <Grid.Column>
              <Card>
                <Card.Content>
                  <Card.Header>Usuários Cadastrados</Card.Header>
                  <Card.Meta>{stats.usuarios}</Card.Meta>
                  <Card.Description>Total de usuários registrados no sistema.</Card.Description>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content>
                  <Card.Header>Especialidades Cadastradas</Card.Header>
                  <Card.Meta>{stats.especialidades}</Card.Meta>
                  <Card.Description>Especialidades disponíveis para agendamento.</Card.Description>
                </Card.Content>
              </Card>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      )}

      {/* Mensagem Importante */}
      <Message
        info
        icon="info circle"
        header="Atualização do Sistema"
        content="Uma nova atualização será realizada no sistema amanhã, entre 03:00 e 05:00. Durante esse período, pode haver instabilidade no sistema."
        style={{ marginBottom: "2em" }}
      />

      {/* Botões de Ações */}
      <Button
        as={Link}
        to="/admin/gerenciar-usuarios"
        color="orange"
        icon
        labelPosition="left"
        style={{ marginBottom: "1em" }}
      >
        <Icon name="users" />
        Gerenciar Usuários
      </Button>

      <Button
        as={Link}
        to="/admin/gerenciar-consultas"
        color="red"
        icon
        labelPosition="left"
        style={{ marginBottom: "1em" }}
      >
        <Icon name="stethoscope" />
        Gerenciar Consultas
      </Button>

      <Button
        as={Link}
        to="/admin/gerenciar-especialidades"
        color="blue"
        icon
        labelPosition="left"
        style={{ marginBottom: "1em" }}
      >
        <Icon name="clipboard list" />
        Gerenciar Especialidades
      </Button>

      <Button
        as={Link}
        to="/admin/gerenciar-relatorios"
        color="teal"
        icon
        labelPosition="left"
      >
        <Icon name="chart bar" />
        Visualizar Relatórios
      </Button>
    </Segment>
  );
};


// --- GERENCIAR USUÁRIOS ADMIN (NOVA) ---
const AdminGerenciarUsuariosPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState("pacientes");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    userId: null,
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/admin/usuarios/${activeTab}`);
      setUsers(response.data);
      setCurrentPage(1);
    } catch (err) {
      console.error(`Erro ao carregar ${activeTab}:`, err);
      setError(`Falha ao carregar lista de ${activeTab}.`);
    } finally {
      setLoading(false);
    }
  }, [api, activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.nome.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleDelete = async () => {
    const userId = confirmModal.userId;
    try {
      setLoadingDeleteId(userId);
      await api.delete(`/admin/usuarios/${activeTab}/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmModal({ open: false, userId: null });
    } catch (err) {
      console.error(err);
      setError(
        "Erro ao excluir usuário. Verifique se ele possui dados associados."
      );
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleEdit = (userId) => {
    // Aqui você pode redirecionar, por exemplo:
    // navigate(`/admin/usuarios/${activeTab}/editar/${userId}`);
    alert(`Editar usuário ID: ${userId} (implementar navegação)`);
  };

  const handleTabChange = (e, { name }) => {
    setActiveTab(name);
    setSearchTerm("");
  };

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  return (
    <Segment
     vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2" icon="users" content="Gerenciamento de Usuários" />

      <Menu pointing secondary>
        <Menu.Item
          name="pacientes"
          icon="user"
          active={activeTab === "pacientes"}
          onClick={handleTabChange}
        />
        <Menu.Item
          name="medicos"
          icon="stethoscope"
          active={activeTab === "medicos"}
          onClick={handleTabChange}
        />
        <Menu.Item
          name="admins"
          icon="shield"
          active={activeTab === "admins"}
          onClick={handleTabChange}
        />
      </Menu>

      <Input
        icon="search"
        placeholder="Buscar por nome ou email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fluid
        style={{ marginBottom: "1em" }}
      />

      {loading && (
        <Loader
          active
          inline="centered"
          content={`Carregando ${activeTab}...`}
        />
      )}
      {error && <Message error header="Erro" content={error} />}

      {!loading && !error && (
        <>
          <Table celled striped compact="very">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>ID</Table.HeaderCell>
                <Table.HeaderCell>Nome</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>
                  {activeTab === "medicos" ? "CRM" : "CPF"}
                </Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Perfis</Table.HeaderCell>
                <Table.HeaderCell>Ações</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {paginatedUsers.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell>{user.id}</Table.Cell>
                  <Table.Cell>{user.nome}</Table.Cell>
                  <Table.Cell>{user.email}</Table.Cell>
                  <Table.Cell>{user.crm || user.cpf || "N/A"}</Table.Cell>
                  <Table.Cell>
                    <Label color={user.ativo ? "green" : "grey"} size="small">
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Label>
                  </Table.Cell>
                  <Table.Cell>
                    {user.roles?.map((role) => (
                      <Label key={role} size="tiny" style={{ marginBottom: 2 }}>
                        <Icon name="user secret" /> {role}
                      </Label>
                    )) || <Label color="red">N/A</Label>}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      icon="edit"
                      size="mini"
                      primary
                      title="Editar"
                      onClick={() => handleEdit(user.id)}
                    />
                    <Button
                      icon="trash"
                      color="red"
                      size="mini"
                      loading={loadingDeleteId === user.id}
                      onClick={() =>
                        setConfirmModal({ open: true, userId: user.id })
                      }
                      title="Excluir"
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <Pagination
            activePage={currentPage}
            totalPages={totalPages}
            onPageChange={(e, { activePage }) => setCurrentPage(activePage)}
            size="small"
            floated="right"
          />
        </>
      )}

      {!loading && filteredUsers.length === 0 && !error && (
        <Message
          info
          header="Nenhum usuário encontrado"
          content={`Não há ${activeTab} com esse critério.`}
        />
      )}

      {/* Modal de confirmação */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, userId: null })}
        size="tiny"
      >
        <Modal.Header>Confirmar Exclusão</Modal.Header>
        <Modal.Content>
          <p>Tem certeza de que deseja excluir este usuário?</p>
        </Modal.Content>
        <Modal.Actions>
          <Button
            onClick={() => setConfirmModal({ open: false, userId: null })}
          >
            Cancelar
          </Button>
          <Button
            negative
            icon="trash"
            content="Excluir"
            loading={loadingDeleteId === confirmModal.userId}
            onClick={handleDelete}
          />
        </Modal.Actions>
      </Modal>
    </Segment>
  );
};



// --- GERENCIAR CONSULTAS ADMIN (NOVA) ---
const AdminGerenciarConsultasPage = () => {
  const { api } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [filteredConsultas, setFilteredConsultas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    consultaId: null,
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const consultasPerPage = 5;
  
  const navigate = useNavigate(); // Navegação

  const fetchConsultas = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/consultas");
      setConsultas(response.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Erro ao carregar consultas:", err);
      setError("Falha ao carregar lista de consultas.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchConsultas();
  }, [fetchConsultas]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = consultas.filter(
      (consulta) =>
        consulta.pacienteNome.toLowerCase().includes(term) ||
        consulta.medicoNome.toLowerCase().includes(term)
    );
    setFilteredConsultas(filtered);
  }, [searchTerm, consultas]);

  const handleDelete = async () => {
    const consultaId = confirmModal.consultaId;
    try {
      setLoadingDeleteId(consultaId);
      await api.delete(`/admin/consultas/${consultaId}`);
      setConsultas((prev) =>
        prev.filter((c) => c.id !== consultaId)
      );
      setConfirmModal({ open: false, consultaId: null });
      toast.success(
        <>
          <FaCheckCircle style={{ marginRight: "8px" }} />
          Consulta excluída com sucesso!
        </>
      );
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir consulta.");
      toast.error(
        <>
          <FaExclamationCircle style={{ marginRight: "8px" }} />
          Erro ao excluir consulta.
        </>
      );
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleEdit = (consultaId) => {
    // Navegação para editar
    navigate(`/admin/editar-consulta/${consultaId}`);
  };

  // Paginação
  const totalPages = Math.ceil(filteredConsultas.length / consultasPerPage);
  const paginatedConsultas = filteredConsultas.slice(
    (currentPage - 1) * consultasPerPage,
    currentPage * consultasPerPage
  );

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2" icon="calendar check" content="Gerenciamento de Consultas" />
      
      <Button
        icon="plus"
        content="Adicionar Consulta"
        primary
        onClick={() => navigate("/admin/adicionar-consulta")}
        style={{ marginBottom: "1em" }}
      />
      
      <Input
        icon="search"
        placeholder="Buscar por paciente ou médico..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fluid
        style={{ marginBottom: "1em" }}
      />

      {loading && (
        <Loader active inline="centered" content="Carregando consultas..." />
      )}
      {error && <Message error header="Erro" content={error} />}

      {!loading && !error && (
        <>
          <Table celled striped compact="very">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>ID</Table.HeaderCell>
                <Table.HeaderCell>Data/Hora</Table.HeaderCell>
                <Table.HeaderCell>Paciente</Table.HeaderCell>
                <Table.HeaderCell>Médico</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Ações</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {paginatedConsultas.map((consulta) => (
                <Table.Row key={consulta.id}>
                  <Table.Cell>{consulta.id}</Table.Cell>
                  <Table.Cell>{new Date(consulta.dataHora).toLocaleString("pt-BR")}</Table.Cell>
                  <Table.Cell>{consulta.pacienteNome}</Table.Cell>
                  <Table.Cell>{consulta.medicoNome}</Table.Cell>
                  <Table.Cell>{consulta.status}</Table.Cell>
                  <Table.Cell>
                    <Button
                      icon="edit"
                      size="mini"
                      primary
                      title="Editar"
                      onClick={() => handleEdit(consulta.id)}
                    />
                    <Button
                      icon="trash"
                      color="red"
                      size="mini"
                      loading={loadingDeleteId === consulta.id}
                      onClick={() =>
                        setConfirmModal({
                          open: true,
                          consultaId: consulta.id,
                        })
                      }
                      title="Excluir"
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <Pagination
            activePage={currentPage}
            totalPages={totalPages}
            onPageChange={(e, { activePage }) => setCurrentPage(activePage)}
            size="small"
            floated="right"
          />
        </>
      )}

      {!loading && filteredConsultas.length === 0 && !error && (
        <Message
          info
          header="Nenhuma consulta encontrada"
          content="Não há consultas com esse critério."
        />
      )}

      {/* Modal de confirmação */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, consultaId: null })}
        size="tiny"
      >
        <Modal.Header>Confirmar Exclusão</Modal.Header>
        <Modal.Content>
          <p>Tem certeza de que deseja excluir esta consulta?</p>
        </Modal.Content>
        <Modal.Actions>
          <Button
            onClick={() => setConfirmModal({ open: false, consultaId: null })}
          >
            Cancelar
          </Button>
          <Button
            negative
            icon="trash"
            content="Excluir"
            loading={loadingDeleteId === confirmModal.consultaId}
            onClick={handleDelete}
          />
        </Modal.Actions>
      </Modal>
    </Segment>
  );
};


// --- GERENCIAR ESPECIALIDADES ADMIN (NOVA) ---
const AdminGerenciarEspecialidadesPage = () => {
  const { api } = useAuth();
  const [especialidades, setEspecialidades] = useState([]);
  const [filteredEspecialidades, setFilteredEspecialidades] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    especialidadeId: null,
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const especialidadesPerPage = 5;
  
  const navigate = useNavigate(); // Navegação

  const fetchEspecialidades = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/especialidades");
      setEspecialidades(response.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Erro ao carregar especialidades:", err);
      setError("Falha ao carregar lista de especialidades.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEspecialidades();
  }, [fetchEspecialidades]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = especialidades.filter(
      (especialidade) =>
        especialidade.nome.toLowerCase().includes(term) ||
        especialidade.descricao.toLowerCase().includes(term)
    );
    setFilteredEspecialidades(filtered);
  }, [searchTerm, especialidades]);

  const handleDelete = async () => {
    const especialidadeId = confirmModal.especialidadeId;
    try {
      setLoadingDeleteId(especialidadeId);
      await api.delete(`/admin/especialidades/${especialidadeId}`);
      setEspecialidades((prev) =>
        prev.filter((e) => e.id !== especialidadeId)
      );
      setConfirmModal({ open: false, especialidadeId: null });
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir especialidade.");
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleEdit = (especialidadeId) => {
    // Implementar navegação para editar
    navigate(`/admin/editar-especialidade/${especialidadeId}`);
  };

  // Paginação
  const totalPages = Math.ceil(filteredEspecialidades.length / especialidadesPerPage);
  const paginatedEspecialidades = filteredEspecialidades.slice(
    (currentPage - 1) * especialidadesPerPage,
    currentPage * especialidadesPerPage
  );

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2" icon="stethoscope" content="Gerenciamento de Especialidades" />
      
      <Button
        icon="plus"
        content="Adicionar Especialidade"
        primary
        onClick={() => navigate("/admin/adicionar-especialidade")}
        style={{ marginBottom: "1em" }}
      />
      
      <Input
        icon="search"
        placeholder="Buscar por nome ou descrição..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fluid
        style={{ marginBottom: "1em" }}
      />

      {loading && (
        <Loader active inline="centered" content="Carregando especialidades..." />
      )}
      {error && <Message error header="Erro" content={error} />}

      {!loading && !error && (
        <>
          <Table celled striped compact="very">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>ID</Table.HeaderCell>
                <Table.HeaderCell>Nome</Table.HeaderCell>
                <Table.HeaderCell>Descrição</Table.HeaderCell>
                <Table.HeaderCell>Ações</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {paginatedEspecialidades.map((especialidade) => (
                <Table.Row key={especialidade.id}>
                  <Table.Cell>{especialidade.id}</Table.Cell>
                  <Table.Cell>{especialidade.nome}</Table.Cell>
                  <Table.Cell>{especialidade.descricao}</Table.Cell>
                  <Table.Cell>
                    <Button
                      icon="edit"
                      size="mini"
                      primary
                      title="Editar"
                      onClick={() => handleEdit(especialidade.id)}
                    />
                    <Button
                      icon="trash"
                      color="red"
                      size="mini"
                      loading={loadingDeleteId === especialidade.id}
                      onClick={() =>
                        setConfirmModal({
                          open: true,
                          especialidadeId: especialidade.id,
                        })
                      }
                      title="Excluir"
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <Pagination
            activePage={currentPage}
            totalPages={totalPages}
            onPageChange={(e, { activePage }) => setCurrentPage(activePage)}
            size="small"
            floated="right"
          />
        </>
      )}

      {!loading && filteredEspecialidades.length === 0 && !error && (
        <Message
          info
          header="Nenhuma especialidade encontrada"
          content="Não há especialidades com esse critério."
        />
      )}

      {/* Modal de confirmação */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, especialidadeId: null })}
        size="tiny"
      >
        <Modal.Header>Confirmar Exclusão</Modal.Header>
        <Modal.Content>
          <p>Tem certeza de que deseja excluir esta especialidade?</p>
        </Modal.Content>
        <Modal.Actions>
          <Button
            onClick={() => setConfirmModal({ open: false, especialidadeId: null })}
          >
            Cancelar
          </Button>
          <Button
            negative
            icon="trash"
            content="Excluir"
            loading={loadingDeleteId === confirmModal.especialidadeId}
            onClick={handleDelete}
          />
        </Modal.Actions>
      </Modal>
    </Segment>
  );
};


// --- GERENCIAR RELATÓRIOS ADMIN (NOVA) ---
const AdminGerenciarRelatoriosPage = () => {
  const { api } = useAuth();
  const [relatorios, setRelatorios] = useState([]);
  const [filteredRelatorios, setFilteredRelatorios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    relatorioId: null,
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const relatoriosPerPage = 5;
  
  const navigate = useNavigate(); // Navegação

  const fetchRelatorios = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/relatorios");
      setRelatorios(response.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
      setError("Falha ao carregar lista de relatórios.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchRelatorios();
  }, [fetchRelatorios]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = relatorios.filter(
      (relatorio) =>
        relatorio.titulo.toLowerCase().includes(term) ||
        relatorio.descricao.toLowerCase().includes(term)
    );
    setFilteredRelatorios(filtered);
  }, [searchTerm, relatorios]);

  const handleDelete = async () => {
    const relatorioId = confirmModal.relatorioId;
    try {
      setLoadingDeleteId(relatorioId);
      await api.delete(`/admin/relatorios/${relatorioId}`);
      setRelatorios((prev) =>
        prev.filter((r) => r.id !== relatorioId)
      );
      setConfirmModal({ open: false, relatorioId: null });
      toast.success(
        <>
          <FaCheckCircle style={{ marginRight: "8px" }} />
          Relatório excluído com sucesso!
        </>
      );
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir relatório.");
      toast.error(
        <>
          <FaExclamationCircle style={{ marginRight: "8px" }} />
          Erro ao excluir relatório.
        </>
      );
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleEdit = (relatorioId) => {
    // Navegação para editar
    navigate(`/admin/editar-relatorio/${relatorioId}`);
  };

  // Função de Impressão
  const handlePrint = () => {
    const content = document.getElementById("relatorios-table").outerHTML;
    const newWindow = window.open("", "", "width=800, height=600");
    newWindow.document.write(content);
    newWindow.document.close();
    newWindow.print();
  };

  // Paginação
  const totalPages = Math.ceil(filteredRelatorios.length / relatoriosPerPage);
  const paginatedRelatorios = filteredRelatorios.slice(
    (currentPage - 1) * relatoriosPerPage,
    currentPage * relatoriosPerPage
  );

  return (
    <Segment
      vertical
      style={{
        padding: "2em 2em",
        background: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Header as="h2" icon="file alternate" content="Gerenciamento de Relatórios" />
      
      <Button
        icon="plus"
        content="Adicionar Relatório"
        primary
        onClick={() => navigate("/admin/adicionar-relatorio")}
        style={{ marginBottom: "1em" }}
      />
      
      <Button
        icon="print"
        content="Imprimir Relatórios"
        secondary
        onClick={handlePrint} // Chama a função de impressão
        style={{ marginBottom: "1em", marginLeft: "1em" }}
      />
      
      <Input
        icon="search"
        placeholder="Buscar por título ou descrição..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fluid
        style={{ marginBottom: "1em" }}
      />

      {loading && (
        <Loader active inline="centered" content="Carregando relatórios..." />
      )}
      {error && <Message error header="Erro" content={error} />}

      {!loading && !error && (
        <>
          <Table celled striped compact="very" id="relatorios-table">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>ID</Table.HeaderCell>
                <Table.HeaderCell>Título</Table.HeaderCell>
                <Table.HeaderCell>Descrição</Table.HeaderCell>
                <Table.HeaderCell>Data</Table.HeaderCell>
                <Table.HeaderCell>Ações</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {paginatedRelatorios.map((relatorio) => (
                <Table.Row key={relatorio.id}>
                  <Table.Cell>{relatorio.id}</Table.Cell>
                  <Table.Cell>{relatorio.titulo}</Table.Cell>
                  <Table.Cell>{relatorio.descricao}</Table.Cell>
                  <Table.Cell>{new Date(relatorio.data).toLocaleDateString("pt-BR")}</Table.Cell>
                  <Table.Cell>
                    <Button
                      icon="edit"
                      size="mini"
                      primary
                      title="Editar"
                      onClick={() => handleEdit(relatorio.id)}
                    />
                    <Button
                      icon="trash"
                      color="red"
                      size="mini"
                      loading={loadingDeleteId === relatorio.id}
                      onClick={() =>
                        setConfirmModal({
                          open: true,
                          relatorioId: relatorio.id,
                        })
                      }
                      title="Excluir"
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <Pagination
            activePage={currentPage}
            totalPages={totalPages}
            onPageChange={(e, { activePage }) => setCurrentPage(activePage)}
            size="small"
            floated="right"
          />
        </>
      )}

      {!loading && filteredRelatorios.length === 0 && !error && (
        <Message
          info
          header="Nenhum relatório encontrado"
          content="Não há relatórios com esse critério."
        />
      )}

      {/* Modal de confirmação de Exclusão */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, relatorioId: null })}
        size="tiny"
      >
        <Modal.Header>Confirmar Exclusão</Modal.Header>
        <Modal.Content>
          <p>Tem certeza de que deseja excluir este relatório?</p>
        </Modal.Content>
        <Modal.Actions>
          <Button
            onClick={() => setConfirmModal({ open: false, relatorioId: null })}
          >
            Cancelar
          </Button>
          <Button
            negative
            icon="trash"
            content="Excluir"
            loading={loadingDeleteId === confirmModal.relatorioId}
            onClick={handleDelete}
          />
        </Modal.Actions>
      </Modal>
    </Segment>
  );
};



// --- ACESSO NÃO AUTORIZADO ---
const NaoAutorizadoPage = () => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgb(255, 255, 255)",
      padding: "10em 2em",
      borderRadius: "8px",
    }}>
      <Container text textAlign="center">
        <Icon
          name="ban"
          size="huge"
          color="red"
          style={{
            marginBottom: "0.1em",
          }}
        />

        <Header as="h1" style={{
          fontSize: "1.8em",
          color: "#d63333",
          marginBottom: "0.3em",
          textShadow: "1px 1px 2px rgba(0,0,0,0.1)"
        }}>
          Acesso Negado!
        </Header>

        <p style={{
          fontSize: "1em",
          color: "#555",
          marginBottom: "2em"
        }}>
          Você não tem permissão para visualizar esta página. <br />
          Por favor, verifique suas credenciais ou volte para a página inicial.
        </p>

        <Button
          as={Link}
          to="/"
          color="blue"
          size="huge"
          style={{
            padding: "1em 1em",
            fontWeight: "600",
            borderRadius: "6px"
          }}
        >
        
        <Icon name="home" style={{ margin: "0em" }} />
      </Button>
    </Container>
  </div>
);


// ######################################################################
// ## FIM DAS PÁGINAS GERADAS/ATUALIZADAS
// ######################################################################

// --- Componente Principal da Aplicação ---
function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/contatos" element={<ContatoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registrar" element={<RegisterPacientePage />} />
            <Route path="/nao-autorizado" element={<NaoAutorizadoPage />} />

            {/* Rotas Privadas para Pacientes */}
            <Route
              path="/paciente/dashboard"
              element={
                <PrivateRoute roles={["ROLE_PACIENTE"]}>
                  <PacienteDashboardPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/paciente/agendar-consulta"
              element={
                <PrivateRoute roles={["ROLE_PACIENTE"]}>
                  <AgendarConsultaPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/paciente/reagendar-consulta/:id"
              element={
                <PrivateRoute roles={["ROLE_PACIENTE"]}>
                  <ReagendarConsultaPage />
                </PrivateRoute>
              }
            />

            {/* Rotas Privadas para Médicos */}
            <Route
              path="/medico/dashboard"
              element={
                <PrivateRoute roles={["ROLE_MEDICO"]}>
                  <MedicoDashboardPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/medico/agenda"
              element={
                <PrivateRoute roles={["ROLE_MEDICO"]}>
                  <MedicoAgendaPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/medico/pacientes"
              element={
                <PrivateRoute roles={["ROLE_MEDICO"]}>
                  <MedicoPacientesPage />
                </PrivateRoute>
              }
            />

            {/* Rotas Privadas para Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute roles={["ROLE_ADMIN"]}>
                  <AdminDashboardPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/gerenciar-usuarios"
              element={
                <PrivateRoute roles={["ROLE_ADMIN"]}>
                  <AdminGerenciarUsuariosPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/gerenciar-consultas"
              element={
                <PrivateRoute roles={["ROLE_ADMIN"]}>
                  <AdminGerenciarConsultasPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/admin/gerenciar-especialidades"
              element={
                <PrivateRoute roles={["ROLE_ADMIN"]}>
                  <AdminGerenciarEspecialidadesPage />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/admin/gerenciar-relatorios"
              element={
                <PrivateRoute roles={["ROLE_ADMIN"]}>
                  <AdminGerenciarRelatoriosPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/perfil"
              element={
                <PrivateRoute>
                  <UserProfilePage />
                </PrivateRoute>
              }
            />

            {/* Rota de Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
