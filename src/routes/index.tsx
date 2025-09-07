import { Routes, Route } from "react-router-dom";
import { lazy, ReactElement, Suspense } from "react";
import Layout from "@/components/Layout";
import { LoadingComponent } from "@/components/Loading";

// 懒加载页面组件
const HomePage = lazy(() => import("@/pages/Home"));
const PixelCanvasDebugPage = lazy(() => import("@/pages/PixelCanvasDebug"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

// 给部分页面添加通用的自适应边距
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
