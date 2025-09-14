import { Routes, Route } from "react-router-dom";
import { lazy, ReactElement, Suspense } from "react";
import Layout from "@/components/Layout";
import { LoadingComponent } from "@/components/Loading";

// Lazy load page components
const HomePage = lazy(() => import("@/pages/Home"));
const PixelCanvasDebugPage = lazy(() => import("@/pages/PixelCanvasDebug"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

// Add common adaptive margins to some pages
const PageWrapper: React.FC<{ children: ReactElement }> = ({ children }) => {
  return <div className="container section-padding">{children}</div>;
};

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="canvas" element={<PixelCanvasDebugPage />} />
          <Route
            path="*"
            element={
              <PageWrapper>
                <NotFoundPage />
              </PageWrapper>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
