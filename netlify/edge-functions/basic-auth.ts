export default async (request, context) => {
  // Poniżej ustawiamy login i hasło
  const expectedUser = "maciek";
  const expectedPass = "start123";

  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Basic ${btoa(`${expectedUser}:${expectedPass}`)}`;

  if (authHeader !== expectedAuth) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Wpisz haslo dostepu"',
      },
    });
  }

  return context.next();
};
