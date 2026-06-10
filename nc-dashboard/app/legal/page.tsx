import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export const metadata = {
  title: "Legal | NuncaCierro",
  description:
    "Política de privacidad, términos y condiciones, y datos y cumplimientos de NuncaCierro.",
};

const sections = [
  {
    id: "privacidad",
    title: "Política de privacidad",
    content: (
      <>
        <p>
          En <strong>NuncaCierro</strong> («nosotros», «nuestro», «la plataforma»)
          respetamos tu privacidad y la de los usuarios que interactúan con los
          negocios que utilizan nuestro servicio.
        </p>

        <h3>1. ¿Qué datos recolectamos?</h3>
        <p>
          Al registrarte como negocio en NuncaCierro, recolectamos:
        </p>
        <ul>
          <li>Nombre del negocio y nombre de contacto</li>
          <li>Correo electrónico (<strong>soporte@nuncacierro.com</strong> es nuestro canal oficial)</li>
          <li>Número de teléfono — usado exclusivamente para vincular tu WhatsApp Business</li>
          <li>Información del negocio: categoría, ciudad, horarios, catálogo de productos/servicios, preguntas frecuentes</li>
          <li>Datos de pago (cuando corresponda) — gestionados vía transferencia bancaria</li>
        </ul>

        <h3>2. ¿Cómo usamos tus datos?</h3>
        <p>Usamos tu información exclusivamente para:</p>
        <ul>
          <li>Configurar, operar y mantener el servicio de automatización WhatsApp contratado</li>
          <li>Procesar las conversaciones de tus clientes a través del bot de IA (Groq) o respuestas programadas</li>
          <li>Enviarte métricas semanales y notificaciones del servicio</li>
          <li>Contactarte para soporte o cambios en el servicio</li>
          <li>Cumplir con obligaciones legales colombianas (Ley 1581 de 2012 — Protección de Datos Personales)</li>
        </ul>
        <p>
          <strong>No vendemos, alquilamos ni compartimos tus datos con terceros</strong> para fines comerciales o publicitarios.
        </p>

        <h3>3. Datos de tus clientes</h3>
        <p>
          Cuando un cliente escribe a tu WhatsApp automatizado, almacenamos:
        </p>
        <ul>
          <li>El número de teléfono del cliente (anonimizado en métricas)</li>
          <li>El contenido de los mensajes enviados y recibidos</li>
          <li>La fecha y hora de cada conversación</li>
        </ul>
        <p>
          Estos datos se almacenan exclusivamente para que el bot funcione
          (contexto de conversación, historial) y para generarte métricas de uso.
          <strong>Tú eres el responsable del tratamiento</strong> de los datos de tus
          clientes finales. Te recomendamos informar a tus clientes que su
          conversación es gestionada por un asistente automatizado.
        </p>

        <h3>4. ¿Dónde se almacenan los datos?</h3>
        <p>
          Los datos se almacenan en servidores seguros con acceso restringido.
          Las conversaciones y configuraciones de negocio se procesan a través de
          <strong> Groq API</strong> (proveedor de inteligencia artificial), que puede
          procesar datos en servidores ubicados fuera de Colombia. Al usar nuestro
          servicio, aceptas esta transferencia internacional de datos necesaria
          para el funcionamiento de la IA.
        </p>

        <h3>5. Tus derechos (Ley 1581 de 2012)</h3>
        <p>Como titular de los datos, tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos personales</li>
          <li>Solicitar prueba de la autorización otorgada para el tratamiento</li>
          <li>Ser informado sobre el uso que se ha dado a tus datos</li>
          <li>Revocar la autorización y solicitar la eliminación de tus datos</li>
          <li>Acceder de forma gratuita a tus datos personales</li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, escríbenos a{" "}
          <strong>soporte@nuncacierro.com</strong> con el asunto
          «Protección de Datos — [Nombre de tu negocio]». Responderemos en un
          plazo máximo de 10 días hábiles.
        </p>

        <h3>6. Seguridad</h3>
        <p>
          Implementamos medidas técnicas y organizativas para proteger tus datos
          contra acceso no autorizado, pérdida o alteración. Sin embargo, ningún
          sistema es 100 % seguro. Si detectas alguna vulnerabilidad, por favor
          repórtala de inmediato a <strong>soporte@nuncacierro.com</strong>.
        </p>

        <h3>7. Cambios a esta política</h3>
        <p>
          Nos reservamos el derecho de actualizar esta política en cualquier momento.
          Te notificaremos los cambios a través del correo electrónico registrado o
          mediante un aviso visible en la plataforma.
        </p>

        <p className="text-stone-400 text-sm">
          Última actualización: junio de 2026.
        </p>
      </>
    ),
  },
  {
    id: "terminos",
    title: "Términos y condiciones",
    content: (
      <>
        <p>
          Al utilizar <strong>NuncaCierro</strong> («el servicio»), aceptas los
          siguientes términos y condiciones. Si no estás de acuerdo, no utilices
          el servicio.
        </p>

        <h3>1. Descripción del servicio</h3>
        <p>
          NuncaCierro es una plataforma de automatización de atención al cliente
          vía WhatsApp. Ofrecemos:
        </p>
        <ul>
          <li>Respuestas automáticas programadas por palabras clave (plan Básico)</li>
          <li>Respuestas con inteligencia artificial mediante Groq (planes Profesional y Empresarial)</li>
          <li>Dashboard de métricas y panel de control</li>
          <li>Configuración y soporte técnico</li>
        </ul>

        <h3>2. Registro y cuenta</h3>
        <p>
          Para usar el servicio, debes proporcionar información veraz y completa.
          Eres responsable de mantener la confidencialidad de tus credenciales
          de acceso. NuncaCierro se reserva el derecho de suspender o cancelar
          cuentas que violen estos términos.
        </p>

        <h3>3. Planes y pagos</h3>
        <p>
          Ofrecemos tres planes (Básico, Profesional y Empresarial) más un
          período de prueba gratuito de 7 días con respuestas programadas. Los
          precios y características de cada plan se detallan en la sección de
          Planes de nuestro sitio web.
        </p>
        <ul>
          <li>Los pagos se realizan por transferencia bancaria.</li>
          <li>La facturación es mensual y recurrente.</li>
          <li>Puedes cancelar en cualquier momento sin penalización.</li>
          <li>No se realizan reembolsos por períodos parciales no utilizados.</li>
          <li>NuncaCierro se reserva el derecho de modificar los precios con
          previo aviso de 30 días.</li>
        </ul>

        <h3>4. Período de prueba</h3>
        <p>
          El período de prueba gratuito de 7 días incluye exclusivamente
          respuestas programadas (sin inteligencia artificial). Al finalizar
          el período de prueba, el servicio se desactivará automáticamente a
          menos que elijas un plan pago. No se requiere tarjeta de crédito
          para iniciar la prueba.
        </p>

        <h3>5. Uso aceptable</h3>
        <p>Te comprometes a:</p>
        <ul>
          <li>No utilizar el servicio para actividades ilegales, fraudulentas o no autorizadas</li>
          <li>No enviar spam, mensajes masivos no solicitados o contenido malicioso</li>
          <li>No infringir derechos de propiedad intelectual de terceros</li>
          <li>Cumplir con los Términos de Servicio de WhatsApp Business y Meta</li>
          <li>Informar a tus clientes cuando interactúan con un sistema automatizado</li>
          <li>Cumplir con la Ley 1581 de 2012 respecto a los datos de tus clientes</li>
        </ul>
        <p>
          NuncaCierro se reserva el derecho de suspender inmediatamente cualquier
          cuenta que viole estas condiciones, sin previo aviso y sin derecho a
          reembolso.
        </p>

        <h3>6. Propiedad intelectual</h3>
        <p>
          La marca «NuncaCierro», el código fuente del software, el diseño
          del sitio web, los logotipos, las plantillas de agentes y todo el
          contenido original de la plataforma son propiedad exclusiva de
          NuncaCierro o de sus licenciantes. No se concede ninguna licencia
          implícita sobre estos elementos.
        </p>
        <p>
          Tú conservas la propiedad de los datos e información de tu negocio
          (catálogo, horarios, FAQ, mensajes). Nos concedes una licencia limitada
          para usar estos datos exclusivamente con el fin de prestarte el servicio.
        </p>

        <h3>7. Limitación de responsabilidad</h3>
        <p>
          NuncaCierro se proporciona «tal cual» y «según disponibilidad». No
          garantizamos que el servicio sea ininterrumpido, libre de errores o
          completamente seguro. En ningún caso seremos responsables por:
        </p>
        <ul>
          <li>Pérdida de ingresos, clientes, datos o beneficios</li>
          <li>Daños indirectos, incidentales o consecuentes</li>
          <li>Interrupciones del servicio causadas por fallas de WhatsApp, Meta,
            Groq, Evolution API o proveedores de infraestructura externos</li>
          <li>Respuestas incorrectas o inapropiadas generadas por la IA</li>
        </ul>
        <p>
          Nuestra responsabilidad total, en cualquier circunstancia, se limita
          al monto pagado por el servicio en los últimos 3 meses.
        </p>

        <h3>8. Cancelación</h3>
        <p>
          Puedes cancelar tu suscripción en cualquier momento notificándonos por
          WhatsApp o al correo <strong>soporte@nuncacierro.com</strong>. La
          cancelación se hará efectiva al finalizar el período de facturación
          corriente. No hay contratos de permanencia mínima.
        </p>

        <h3>9. Modificaciones a los términos</h3>
        <p>
          Podemos actualizar estos términos en cualquier momento. Te notificaremos
          los cambios con al menos 15 días de anticipación. El uso continuado del
          servicio después de la fecha de vigencia constituye tu aceptación de los
          nuevos términos.
        </p>

        <p className="text-stone-400 text-sm">
          Última actualización: junio de 2026.
        </p>
      </>
    ),
  },
  {
    id: "datos",
    title: "Datos y cumplimientos",
    content: (
      <>
        <p>
          <strong>NuncaCierro</strong> cumple con la normativa colombiana de
          protección de datos (Ley 1581 de 2012) y con las políticas de uso
          de los servicios de terceros que integra.
        </p>

        <h3>1. Cumplimiento con Ley 1581 de 2012 (Habeas Data)</h3>
        <p>
          Como responsable del tratamiento de datos personales, NuncaCierro:
        </p>
        <ul>
          <li>Solicita autorización previa e informada para el tratamiento de datos</li>
          <li>Permite a los titulares ejercer sus derechos de acceso, actualización,
            rectificación y eliminación</li>
          <li>Conserva los datos solo durante el tiempo necesario para cumplir con
            la finalidad del tratamiento</li>
          <li>Implementa medidas de seguridad para proteger los datos personales</li>
          <li>No transfiere datos a terceros sin autorización expresa del titular</li>
        </ul>
        <p>
          El responsable del tratamiento de datos personales puede ser contactado
          en <strong>soporte@nuncacierro.com</strong>.
        </p>

        <h3>2. Procesamiento de IA (Groq API)</h3>
        <p>
          Para los planes Profesional y Empresarial, utilizamos la API de Groq
          para procesar las conversaciones con inteligencia artificial. Al usar
          nuestro servicio, aceptas que:
        </p>
        <ul>
          <li>Los mensajes de tus clientes se envían a los servidores de Groq para
            su procesamiento</li>
          <li>Groq no almacena ni entrena modelos con los datos de las conversaciones</li>
          <li>El tiempo de respuesta puede variar según la disponibilidad del servicio
            de Groq</li>
          <li>NuncaCierro no se hace responsable por interrupciones o fallos del
            servicio de Groq</li>
        </ul>

        <h3>3. WhatsApp Business y Meta</h3>
        <p>
          El servicio se integra con WhatsApp a través de Evolution API y Meta
          Cloud API. Al conectar tu WhatsApp Business a NuncaCierro, aceptas
          también los Términos de Servicio de WhatsApp Business y las políticas
          de Meta Platforms, Inc. Te recomendamos revisar dichos términos en{" "}
          <a
            href="https://www.whatsapp.com/legal/business-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:text-amber-700 underline underline-offset-2"
          >
            whatsapp.com/legal/business-policy
          </a>
          .
        </p>

        <h3>4. Retención de datos</h3>
        <p>
          Conservamos tus datos y los de tus clientes mientras tu cuenta esté
          activa. Al cancelar tu suscripción, eliminaremos tus datos en un plazo
          máximo de 30 días, salvo que exista una obligación legal que requiera
          su conservación.
        </p>
        <p>
          Puedes solicitar la eliminación anticipada de tus datos en cualquier
          momento escribiendo a <strong>soporte@nuncacierro.com</strong>.
        </p>

        <h3>5. Reporte de vulnerabilidades</h3>
        <p>
          Si encuentras alguna vulnerabilidad de seguridad en nuestra plataforma,
          por favor repórtala de inmediato a{" "}
          <strong>soporte@nuncacierro.com</strong>. Agradecemos la divulgación
          responsable y nos comprometemos a responder en un plazo máximo de 48 horas.
        </p>

        <p className="text-stone-400 text-sm">
          Última actualización: junio de 2026.
        </p>
      </>
    ),
  },
];

export default function LegalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EDE0] font-sans text-stone-800">
      <Header />
      <main className="flex-1 pt-32 pb-20 px-3 sm:px-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900 mb-2">
            Información legal
          </h1>
          <p className="text-stone-500 mb-10">
            Política de privacidad, términos y condiciones, y datos y cumplimientos
            de NuncaCierro.
          </p>

          {/* Tabs nav */}
          <nav className="flex flex-wrap gap-2 mb-10 border-b border-stone-300 pb-4">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-4 py-2 text-sm font-medium rounded-full transition-colors border border-stone-300 bg-white hover:bg-stone-50 hover:border-stone-400 text-stone-700"
              >
                {s.title}
              </a>
            ))}
          </nav>

          {/* Sections */}
          <div className="space-y-16">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="text-2xl font-semibold text-stone-900 mb-6 pb-3 border-b border-stone-200">
                  {s.title}
                </h2>
                <div className="prose prose-stone max-w-none [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-stone-800 [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:leading-relaxed [&>p]:mb-4 [&>ul]:mb-6 [&>ul]:list-disc [&>ul]:pl-5 [&>li]:mb-2 [&>li]:leading-relaxed">
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* Acceptance note */}
          <div className="mt-16 p-6 rounded-xl border border-amber-200 bg-amber-50">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">
              Al usar nuestro servicio, aceptas estos términos
            </h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              Al registrarte, iniciar una prueba gratuita o contratar cualquier
              plan de NuncaCierro, confirmas que has leído, entendido y aceptas
              la totalidad de esta Política de Privacidad, los Términos y
              Condiciones y la sección de Datos y Cumplimientos aquí descritos.
              Si tienes dudas, contáctanos antes de continuar en{" "}
              <strong>soporte@nuncacierro.com</strong>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
