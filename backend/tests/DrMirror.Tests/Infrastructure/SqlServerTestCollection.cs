namespace DrMirror.Tests.Infrastructure;

/// <summary>
/// Serializes SQL Server test classes so only one factory runs at a time.
/// Separate from the in-memory <see cref="IntegrationTestCollection"/> to
/// avoid cross-controlling the parallelism of the fast default suite.
/// </summary>
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class SqlServerTestCollection
{
    public const string Name = "SqlServerIntegration";
}
