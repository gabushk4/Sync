import React, { createContext, useState, useContext, ReactNode } from "react";

type RouteContextType = {
  getRoute: () => string;
  ajouterEcran: (ecranCourant: string) => void;
  getEcranActif: () => string | undefined;
  route: string[];
};

const Route = createContext<RouteContextType | undefined>(undefined);

export const useRouteAbs = () => {
  const ctx = useContext(Route);
  if (!ctx) {
    throw new Error("useRouteAbs must be used within a RouteAbsProvider");
  }
  return ctx;
};

export const RouteAbsProvider = ({ children }: { children: ReactNode }) => {
  const [route, setRoute] = useState<string[]>([]);

  const getRoute = () => {
    return (
      route.filter((ecran) => typeof ecran === "string" && ecran.length > 1).join("/") ||
      "inconnu"
    );
  };

  const getEcranActif = () => {
    return route[route.length - 1];
  };

  const ajouterEcran = (ecranCourant: string) => {
    setRoute((prev) => {
      const nouvRoute = [...prev, ecranCourant];
      if (nouvRoute.length > 10) {
        nouvRoute.shift();
      }
      return nouvRoute;
    });
  };

  return (
    <Route.Provider value={{ getRoute, ajouterEcran, getEcranActif, route }}>
      {children}
    </Route.Provider>
  );
};

export default Route;
