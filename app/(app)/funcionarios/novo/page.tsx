import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FuncionarioForm } from '../form';

export default function NovoFuncionarioPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo funcionário"
        description="Cadastro completo: tipo de contrato, salário, EPI, OS curso, período de experiência."
      />
      <Card>
        <CardContent className="py-6">
          <FuncionarioForm />
        </CardContent>
      </Card>
    </div>
  );
}
